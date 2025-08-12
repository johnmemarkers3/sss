import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calculator, Percent, Calendar, DollarSign, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";

type CalculatorProps = {
  initialPrice?: number;
  projectName?: string;
};

export default function InstallmentCalculator({ initialPrice, projectName }: CalculatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [price, setPrice] = useState(initialPrice?.toString() || "");
  const [downPaymentType, setDownPaymentType] = useState<"percent" | "amount">("percent");
  const [downPaymentPercent, setDownPaymentPercent] = useState("30");
  const [downPaymentAmount, setDownPaymentAmount] = useState("");
  const [termType, setTermType] = useState<"months" | "years">("years");
  const [termMonths, setTermMonths] = useState("12");
  const [termYears, setTermYears] = useState("1");
  const [interestRate, setInterestRate] = useState("0");
  const isMobile = useIsMobile();

  // Обновляем цену при изменении initialPrice
  useEffect(() => {
    if (initialPrice) {
      setPrice(initialPrice.toString());
    }
  }, [initialPrice]);

  // Улучшенные функции для безопасного обновления значений с debounce
  const handlePriceChange = useCallback((value: string) => {
    setPrice(value);
  }, []);

  const handleDownPaymentPercentChange = useCallback((value: string) => {
    const cleanValue = value.replace(/[^\d]/g, '');
    const numValue = parseInt(cleanValue) || 0;
    if (numValue <= 100) {
      setDownPaymentPercent(cleanValue);
    }
  }, []);

  const handleDownPaymentAmountChange = useCallback((value: string) => {
    const cleanValue = value.replace(/[^\d]/g, '');
    setDownPaymentAmount(cleanValue);
  }, []);

  const handleTermMonthsChange = useCallback((value: string) => {
    const cleanValue = value.replace(/[^\d]/g, '');
    const numValue = parseInt(cleanValue) || 0;
    if (numValue <= 360) { // Максимум 30 лет
      setTermMonths(cleanValue);
    }
  }, []);

  const handleTermYearsChange = useCallback((value: string) => {
    const cleanValue = value.replace(/[^\d]/g, '');
    const numValue = parseInt(cleanValue) || 0;
    if (numValue <= 30) {
      setTermYears(cleanValue);
    }
  }, []);

  const handleInterestRateChange = useCallback((value: string) => {
    const cleanValue = value.replace(/[^\d.]/g, '');
    const parts = cleanValue.split('.');
    if (parts.length <= 2) {
      const numValue = parseFloat(cleanValue) || 0;
      if (numValue <= 100) {
        setInterestRate(cleanValue);
      }
    }
  }, []);

  // Расчёты
  const priceNum = parseFloat(price.replace(/[^\d.]/g, '')) || 0;
  const downPaymentPercentNum = Math.min(100, parseFloat(downPaymentPercent.replace(/[^\d.]/g, '')) || 0);
  const downPaymentAmountNum = parseFloat(downPaymentAmount.replace(/[^\d.]/g, '')) || 0;
  const termMonthsSan = parseInt(termMonths.replace(/[^\d]/g, '')) || 0;
  const termYearsSan = parseInt(termYears.replace(/[^\d]/g, '')) || 0;
  const termMonthsNum = termType === "months" ? Math.min(360, termMonthsSan) : Math.min(30, termYearsSan) * 12;
  const interestRateNum = Math.min(100, parseFloat(interestRate.replace(/[^\d.]/g, '')) || 0);

  // Первоначальный взнос
  const downPayment = downPaymentType === "percent" 
    ? (priceNum * downPaymentPercentNum) / 100
    : downPaymentAmountNum;

  // Сумма к рассрочке
  const loanAmount = priceNum - downPayment;

  // Ежемесячная процентная ставка
  const monthlyRate = interestRateNum / 100 / 12;

  // Ежемесячный платёж (аннуитетный)
  let monthlyPayment = 0;
  if (monthlyRate > 0 && termMonthsNum > 0) {
    monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, termMonthsNum)) / 
                    (Math.pow(1 + monthlyRate, termMonthsNum) - 1);
  } else if (termMonthsNum > 0) {
    monthlyPayment = loanAmount / termMonthsNum;
  }

  // Общая сумма выплат
  const totalPayment = monthlyPayment * termMonthsNum + downPayment;

  // Переплата
  const overpayment = totalPayment - priceNum;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const resetCalculator = () => {
    setPrice(initialPrice?.toString() || "");
    setDownPaymentType("percent");
    setDownPaymentPercent("30");
    setDownPaymentAmount("");
    setTermType("years");
    setTermMonths("12");
    setTermYears("1");
    setInterestRate("0");
  };

  const CalculatorContent = ({ inDrawer = false }: { inDrawer?: boolean }) => (
    <div className={`grid gap-4 sm:gap-6 ${inDrawer ? '' : 'lg:grid-cols-2'}`}>
      {/* Параметры расчёта */}
      <div className="space-y-4 sm:space-y-6">
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <DollarSign className="size-4" />
              Параметры расчёта
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {/* Цена квартиры */}
            <div className="space-y-2">
              <Label htmlFor="price" className="text-sm font-medium">Цена квартиры, ₽</Label>
              <Input
                id="price"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="7500000"
                value={price}
                onChange={(e) => handlePriceChange(e.target.value)}
                className="h-11 text-base"
              />
            </div>

            {/* Первоначальный взнос */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Первоначальный взнос</Label>
              <Tabs value={downPaymentType} onValueChange={(v) => setDownPaymentType(v as "percent" | "amount")}>
                <TabsList className="grid w-full grid-cols-2 h-9">
                  <TabsTrigger value="percent" className="text-xs sm:text-sm">В процентах</TabsTrigger>
                  <TabsTrigger value="amount" className="text-xs sm:text-sm">Сумма</TabsTrigger>
                </TabsList>
                <TabsContent value="percent" className="mt-3">
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="30"
                      value={downPaymentPercent}
                      onChange={(e) => setDownPaymentPercent(e.target.value)}
                      className="h-11 text-base"
                    />
                    <Percent className="size-4 text-muted-foreground shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    = {formatCurrency(downPayment)}
                  </p>
                </TabsContent>
                <TabsContent value="amount" className="mt-3">
                  <Input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="2250000"
                    value={downPaymentAmount}
                    onChange={(e) => setDownPaymentAmount(e.target.value)}
                    className="h-11 text-base"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    = {priceNum > 0 ? ((downPaymentAmountNum / priceNum) * 100).toFixed(1) : 0}% от стоимости
                  </p>
                </TabsContent>
              </Tabs>
            </div>

            {/* Срок рассрочки */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Срок рассрочки</Label>
              <Tabs value={termType} onValueChange={(v) => setTermType(v as "months" | "years")}>
                <TabsList className="grid w-full grid-cols-2 h-9">
                  <TabsTrigger value="months" className="text-xs sm:text-sm">Месяцы</TabsTrigger>
                  <TabsTrigger value="years" className="text-xs sm:text-sm">Годы</TabsTrigger>
                </TabsList>
                <TabsContent value="months" className="mt-3">
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="12"
                      value={termMonths}
                      onChange={(e) => setTermMonths(e.target.value)}
                      className="h-11 text-base"
                    />
                    <span className="text-sm text-muted-foreground shrink-0">мес.</span>
                  </div>
                </TabsContent>
                <TabsContent value="years" className="mt-3">
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="1"
                      value={termYears}
                      onChange={(e) => setTermYears(e.target.value)}
                      className="h-11 text-base"
                    />
                    <span className="text-sm text-muted-foreground shrink-0">лет</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    = {termMonthsNum} месяцев
                  </p>
                </TabsContent>
              </Tabs>
            </div>

            {/* Процентная ставка */}
            <div className="space-y-2">
              <Label htmlFor="interest" className="text-sm font-medium">Процентная ставка, % годовых</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="interest"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  className="h-11 text-base"
                />
                <TrendingUp className="size-4 text-muted-foreground shrink-0" />
              </div>
              <p className="text-xs text-muted-foreground">
                Оставьте 0 для беспроцентной рассрочки
              </p>
            </div>

            <Button variant="outline" onClick={resetCalculator} className="w-full h-11">
              Сбросить
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Результаты расчёта */}
      <div className="space-y-4 sm:space-y-6">
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Calendar className="size-4" />
              Результаты расчёта
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {priceNum > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1 p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs sm:text-sm text-muted-foreground">Цена квартиры</p>
                    <p className="text-base sm:text-lg font-semibold">{formatCurrency(priceNum)}</p>
                  </div>
                  <div className="space-y-1 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                    <p className="text-xs sm:text-sm text-muted-foreground">Первоначальный взнос</p>
                    <p className="text-base sm:text-lg font-semibold text-orange-600">{formatCurrency(downPayment)}</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-primary/5 rounded-lg">
                    <span className="font-medium text-sm sm:text-base">Ежемесячный платёж</span>
                    <span className="text-lg sm:text-xl font-bold text-primary">
                      {formatCurrency(monthlyPayment)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1 p-3 bg-muted/30 rounded-lg">
                      <p className="text-muted-foreground text-xs">Срок рассрочки</p>
                      <p className="font-medium">{termMonthsNum} мес.</p>
                    </div>
                    <div className="space-y-1 p-3 bg-muted/30 rounded-lg">
                      <p className="text-muted-foreground text-xs">Процентная ставка</p>
                      <p className="font-medium">{interestRateNum}% годовых</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm">Сумма к рассрочке</span>
                      <span className="font-medium">{formatCurrency(loanAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm">Общая переплата</span>
                      <span className={`font-medium ${overpayment > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(overpayment)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-base sm:text-lg p-3 bg-muted/50 rounded-lg">
                      <span className="font-semibold">Итого к выплате</span>
                      <span className="font-bold">{formatCurrency(totalPayment)}</span>
                    </div>
                  </div>
                </div>

                {/* Дополнительная информация */}
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2 text-sm sm:text-base">Полезная информация:</h4>
                  <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
                    <li>• Расчёт производится по аннуитетной схеме</li>
                    <li>• Ежемесячные платежи одинаковые на весь срок</li>
                    <li>• Не учитывает страхование и дополнительные комиссии</li>
                    <li>• Для точного расчёта обратитесь к менеджеру</li>
                  </ul>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calculator className="size-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm sm:text-base">Введите цену квартиры для расчёта</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const trigger = (
    <Button 
      variant="outline" 
      size={isMobile ? "sm" : "default"} 
      className="flex items-center gap-1 sm:gap-2 h-9 sm:h-10 px-2 sm:px-4 text-xs sm:text-sm border-2 border-primary/20 hover:border-primary/40"
    >
      <Calculator className="size-4 shrink-0" />
      <span className="hidden xs:inline">Калькулятор</span>
      <span className="xs:hidden">Калк.</span>
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerTrigger asChild>
          {trigger}
        </DrawerTrigger>
        <DrawerContent className="max-h-[95vh] z-[100]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="flex items-center gap-2 text-base">
              <Calculator className="size-5" />
              <span>Калькулятор рассрочки</span>
              {projectName && <span className="text-muted-foreground text-sm truncate">— {projectName}</span>}
            </DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="h-[calc(95vh-80px)]">
            <div className="px-4 pb-6">
              <CalculatorContent inDrawer={true} />
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="size-5" />
            Калькулятор рассрочки
            {projectName && <span className="text-muted-foreground">— {projectName}</span>}
          </DialogTitle>
          <DialogDescription>Введите параметры для расчёта и сравните варианты.</DialogDescription>
        </DialogHeader>
        <CalculatorContent />
      </DialogContent>
    </Dialog>
  );
}