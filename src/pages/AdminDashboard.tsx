import { Helmet } from "react-helmet-async";
import SiteHeader from "@/components/layout/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Plus, Upload, Eye, Trash2, Home } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";
import { AccessKeysAdmin } from "@/components/access/AccessKeysAdmin";

function useProjects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    if (error) toast({ title: 'Ошибка загрузки проектов', description: error.message });
    setProjects(data || []);
    setLoading(false);
  };
  useEffect(() => { reload(); }, []);
  return { projects, loading, reload };
}

async function uploadFiles(bucket: 'projects' | 'units', files: File[]) {
  const urls: string[] = [];
  for (const file of files) {
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}

function getStoragePathFromPublicUrl(url: string, bucket: 'projects' | 'units') {
  try {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = url.indexOf(marker);
    if (idx !== -1) return url.substring(idx + marker.length);
    const alt = `${bucket}/`;
    const idx2 = url.indexOf(alt);
    if (idx2 !== -1) return url.substring(idx2 + alt.length);
  } catch {}
  return null;
}

async function deleteFiles(bucket: 'projects' | 'units', urls: string[]) {
  const paths = urls
    .map((u) => getStoragePathFromPublicUrl(u, bucket))
    .filter(Boolean) as string[];
  if (paths.length) {
    await supabase.storage.from(bucket).remove(paths);
  }
}
export default function AdminDashboard() {
  const { isAdmin, user, signOut } = useAuth();
  const { projects, reload } = useProjects();
  const [busy, setBusy] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [projectBulkStatus, setProjectBulkStatus] = useState<string>('В продаже');

  const [pImages, setPImages] = useState<FileList | null>(null);
  const [uImages, setUImages] = useState<FileList | null>(null);
  const [uPlan, setUPlan] = useState<FileList | null>(null);

  const [projectForm, setProjectForm] = useState({
    name: '', slug: '', city: '', district: '', address: '', status: 'В продаже',
    price_min: '', price_max: '', area_min: '', area_max: '', deadline: '', description: '', tags: '', amenities: '',
    latitude: '', longitude: '',
    infrastructure_nearby: '',
    map_embed_url: ''
  });
  const [unitForm, setUnitForm] = useState({
    project_id: '', title: '', rooms: 1, area: '', price: '', floor: '', status: 'В продаже'
  });

  useEffect(() => {
    if (!isAdmin) return;
  }, [isAdmin]);

  const projectsOptions = useMemo(() => projects.map(p => ({ id: p.id, name: p.name })), [projects]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !user) return toast({ title: 'Нет прав' });
    setBusy(true);
    try {
      const images = pImages ? await uploadFiles('projects', Array.from(pImages)) : [];
      const { error } = await supabase.from('projects').insert({
        name: projectForm.name,
        slug: projectForm.slug,
        city: projectForm.city,
        district: projectForm.district,
        address: projectForm.address,
        status: projectForm.status as any,
        price_min: Number(projectForm.price_min || 0),
        price_max: Number(projectForm.price_max || 0),
        area_min: projectForm.area_min ? Number(projectForm.area_min) : null,
        area_max: projectForm.area_max ? Number(projectForm.area_max) : null,
        deadline: projectForm.deadline || null,
        description: projectForm.description || null,
        tags: projectForm.tags ? projectForm.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
        amenities: projectForm.amenities ? projectForm.amenities.split(',').map(s => s.trim()).filter(Boolean) : [],
        latitude: projectForm.latitude ? Number(projectForm.latitude) : null,
        longitude: projectForm.longitude ? Number(projectForm.longitude) : null,
        infrastructure_nearby: projectForm.infrastructure_nearby ? projectForm.infrastructure_nearby.split(/\n|,/g).map(s => s.trim()).filter(Boolean) : [],
        map_embed_url: projectForm.map_embed_url ? projectForm.map_embed_url.trim() : null,
        image_urls: images,
      });
      if (error) throw error;
      toast({ title: 'Объект создан' });
      setProjectForm({ 
        name: '', slug: '', city: '', district: '', address: '', status: 'В продаже', 
        price_min: '', price_max: '', area_min: '', area_max: '', deadline: '', description: '', 
        tags: '', amenities: '', latitude: '', longitude: '', infrastructure_nearby: '', map_embed_url: '' 
      });
      setPImages(null);
      await reload();
    } catch (err: any) {
      toast({ title: 'Ошибка создания', description: err.message });
    } finally { setBusy(false); }
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !user) return toast({ title: 'Нет прав' });
    setBusy(true);
    try {
      const images = uImages ? await uploadFiles('units', Array.from(uImages)) : [];
      const plan = uPlan && uPlan[0] ? await uploadFiles('units', [uPlan[0]]) : [];
      const { error } = await supabase.from('units').insert({
        project_id: unitForm.project_id,
        title: unitForm.title || null,
        rooms: Number(unitForm.rooms),
        area: Number(unitForm.area),
        price: Number(unitForm.price),
        floor: unitForm.floor ? Number(unitForm.floor) : null,
        status: unitForm.status as any,
        image_urls: images,
        plan_image_url: plan[0] || null,
      });
      if (error) throw error;
      toast({ title: 'Квартира добавлена' });
      setUnitForm({ project_id: '', title: '', rooms: 1, area: '', price: '', floor: '', status: 'В продаже' });
      setUImages(null); setUPlan(null);
    } catch (err: any) {
      toast({ title: 'Ошибка добавления', description: err.message });
    } finally { setBusy(false); }
  };

  const handleDeleteProject = async (projectId: string) => {
    setDeletingProjectId(projectId);
    try {
      // 1) Удаляем медиа квартир проекта
      const { data: unitsToDelete, error: unitsSelErr } = await supabase
        .from('units')
        .select('id, image_urls, plan_image_url')
        .eq('project_id', projectId);
      if (unitsSelErr) throw unitsSelErr;

      const unitUrls: string[] = [];
      (unitsToDelete || []).forEach((u: any) => {
        if (Array.isArray(u.image_urls)) unitUrls.push(...u.image_urls);
        if (u.plan_image_url) unitUrls.push(u.plan_image_url);
      });
      if (unitUrls.length) {
        await deleteFiles('units', unitUrls);
      }

      // 2) Удаляем строки квартир
      const { error: delUnitsErr } = await supabase.from('units').delete().eq('project_id', projectId);
      if (delUnitsErr) throw delUnitsErr;

      // 3) Удаляем медиа объекта
      const proj = (projects || []).find((p) => p.id === projectId);
      if (proj?.image_urls?.length) {
        await deleteFiles('projects', proj.image_urls);
      }

      // 4) Удаляем сам объект
      const { error: delProjErr } = await supabase.from('projects').delete().eq('id', projectId);
      if (delProjErr) throw delProjErr;

      toast({ title: 'Объект удален', description: 'Связанные квартиры и файлы также удалены.' });
      await reload();
    } catch (err: any) {
      toast({ title: 'Ошибка удаления', description: err.message });
    } finally {
      setDeletingProjectId(null);
    }
  };

  const handleBulkDeleteProjects = async () => {
    if (!selectedProjects.length) return;
    for (const id of selectedProjects) {
      await handleDeleteProject(id);
    }
    setSelectedProjects([]);
  };

  const handleBulkUpdateProjectsStatus = async () => {
    if (!selectedProjects.length) return;
    const { error } = await supabase
      .from('projects')
      .update({ status: projectBulkStatus as any })
      .in('id', selectedProjects);
    if (error) {
      toast({ title: 'Ошибка массового обновления', description: error.message });
    } else {
      toast({ title: 'Статус обновлён', description: `Изменено объектов: ${selectedProjects.length}` });
      setSelectedProjects([]);
      await reload();
    }
  };
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Helmet>
          <title>Админ-панель — требуется вход</title>
          <meta name="description" content="Войдите под администратором для управления объектами." />
          <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : '/'} />
        </Helmet>
        <SiteHeader />
        <main className="container py-12 text-center">
          <p>Требуется авторизация. Перейдите на страницу входа.</p>
          <Link className="story-link" to="/admin">Войти</Link>
        </main>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Helmet>
          <title>Админ-панель — нет доступа</title>
          <meta name="description" content="Недостаточно прав для доступа к админке." />
          <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : '/'} />
        </Helmet>
        <SiteHeader />
        <main className="container py-12 text-center space-y-4">
          <p>У вашего аккаунта нет прав администратора.</p>
          <p className="text-sm text-muted-foreground">Назначьте роль admin в таблице profiles в Supabase.</p>
          <Button onClick={signOut} variant="outline">Выйти</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Админ-панель — управление объектами</title>
        <meta name="description" content="Добавляйте объекты и квартиры, загружайте фотографии и управляйте базой." />
        <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : '/'} />
      </Helmet>
      <SiteHeader />

      <main className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Админ-панель</h1>
            <p className="text-muted-foreground">Управление объектами недвижимости</p>
          </div>
          <Button onClick={signOut} variant="outline">Выйти</Button>
        </div>

        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="projects">Объекты</TabsTrigger>
            <TabsTrigger value="units">Квартиры</TabsTrigger>
            <TabsTrigger value="manage">Управление</TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="size-5" />
                  Добавить новый объект
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form className="grid gap-4" onSubmit={handleCreateProject}>
                  {/* Основная информация */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Название *</label>
                      <Input 
                        placeholder="Название ЖК" 
                        value={projectForm.name} 
                        onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} 
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Slug (URL) *</label>
                      <Input 
                        placeholder="zhk-example" 
                        value={projectForm.slug} 
                        onChange={(e) => setProjectForm({ ...projectForm, slug: e.target.value })} 
                        required 
                      />
                    </div>
                  </div>

                  {/* Адрес */}
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Город *</label>
                      <Input 
                        placeholder="Грозный" 
                        value={projectForm.city} 
                        onChange={(e) => setProjectForm({ ...projectForm, city: e.target.value })} 
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Район *</label>
                      <Input 
                        placeholder="Центральный" 
                        value={projectForm.district} 
                        onChange={(e) => setProjectForm({ ...projectForm, district: e.target.value })} 
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Адрес *</label>
                      <Input 
                        placeholder="ул. Примерная, 1" 
                        value={projectForm.address} 
                        onChange={(e) => setProjectForm({ ...projectForm, address: e.target.value })} 
                        required 
                      />
                    </div>
                  </div>

                  {/* Координаты */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Широта</label>
                      <Input 
                        type="number" 
                        step="any"
                        placeholder="43.3181" 
                        value={projectForm.latitude} 
                        onChange={(e) => setProjectForm({ ...projectForm, latitude: e.target.value })} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Долгота</label>
                      <Input 
                        type="number" 
                        step="any"
                        placeholder="45.6956" 
                        value={projectForm.longitude} 
                        onChange={(e) => setProjectForm({ ...projectForm, longitude: e.target.value })} 
                      />
                    </div>
                  </div>

                  {/* Цены и площади */}
                  <div className="grid sm:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Цена от</label>
                      <Input 
                        type="number" 
                        placeholder="5000000" 
                        value={projectForm.price_min} 
                        onChange={(e) => setProjectForm({ ...projectForm, price_min: e.target.value })} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Цена до</label>
                      <Input 
                        type="number" 
                        placeholder="15000000" 
                        value={projectForm.price_max} 
                        onChange={(e) => setProjectForm({ ...projectForm, price_max: e.target.value })} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Площадь от</label>
                      <Input 
                        type="number" 
                        placeholder="30" 
                        value={projectForm.area_min} 
                        onChange={(e) => setProjectForm({ ...projectForm, area_min: e.target.value })} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Площадь до</label>
                      <Input 
                        type="number" 
                        placeholder="120" 
                        value={projectForm.area_max} 
                        onChange={(e) => setProjectForm({ ...projectForm, area_max: e.target.value })} 
                      />
                    </div>
                  </div>

                  {/* Статус и срок сдачи */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Статус</label>
                      <Select value={projectForm.status} onValueChange={(v) => setProjectForm({ ...projectForm, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="В продаже">В продаже</SelectItem>
                          <SelectItem value="Сдан">Сдан</SelectItem>
                          <SelectItem value="Забронировано">Забронировано</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Срок сдачи</label>
                      <Input 
                        placeholder="Q4 2025" 
                        value={projectForm.deadline} 
                        onChange={(e) => setProjectForm({ ...projectForm, deadline: e.target.value })} 
                      />
                    </div>
                  </div>

                  {/* Описание */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Описание</label>
                    <Textarea 
                      placeholder="Подробное описание объекта..." 
                      value={projectForm.description} 
                      onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} 
                      rows={4}
                    />
                  </div>

                  {/* Теги и удобства */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Теги (через запятую)</label>
                      <Input 
                        placeholder="Скоро сдача, Акция" 
                        value={projectForm.tags} 
                        onChange={(e) => setProjectForm({ ...projectForm, tags: e.target.value })} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Удобства (через запятую)</label>
                      <Input 
                        placeholder="Паркинг, Детская площадка, Консьерж" 
                        value={projectForm.amenities} 
                        onChange={(e) => setProjectForm({ ...projectForm, amenities: e.target.value })} 
                      />
                    </div>
                  </div>

                  {/* Инфраструктура рядом */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Инфраструктура рядом (по строкам или через запятую)</label>
                    <Textarea 
                      placeholder="Парковка во дворе, Парк в 5 минутах, Торговый центр рядом" 
                      value={projectForm.infrastructure_nearby}
                      onChange={(e) => setProjectForm({ ...projectForm, infrastructure_nearby: e.target.value })}
                      rows={4}
                    />
                  </div>

                  {/* Карта (embed URL или iframe) */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Карта (embed URL или iframe)</label>
                    <Textarea 
                      placeholder="Вставьте ссылку на карту или код iframe"
                      value={projectForm.map_embed_url}
                      onChange={(e) => setProjectForm({ ...projectForm, map_embed_url: e.target.value })}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">Можно вставить URL (https://...) или HTML iframe — на странице мы извлечём src автоматически.</p>
                  </div>

                  {/* Фотографии */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Фотографии объекта</label>
                    <Input 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      onChange={(e) => setPImages(e.target.files)} 
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                    <p className="text-xs text-muted-foreground">Выберите несколько фотографий для галереи</p>
                  </div>
                  <Button type="submit" disabled={busy} className="w-full">
                    <Plus className="mr-2" />
                    {busy ? 'Создание...' : 'Создать объект'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="units" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="size-5" />
                  Добавить квартиру
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form className="grid gap-4" onSubmit={handleCreateUnit}>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Объект *</label>
                    <Select value={unitForm.project_id} onValueChange={(v) => setUnitForm({ ...unitForm, project_id: v })} required>
                      <SelectTrigger><SelectValue placeholder="Выберите объект" /></SelectTrigger>
                      <SelectContent>
                        {projectsOptions.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Название планировки</label>
                      <Input 
                        placeholder="Студия, 1К-40, Евро-2К" 
                        value={unitForm.title} 
                        onChange={(e) => setUnitForm({ ...unitForm, title: e.target.value })} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Комнат *</label>
                      <Select value={String(unitForm.rooms)} onValueChange={(v) => setUnitForm({ ...unitForm, rooms: Number(v) })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[0,1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n === 0 ? 'Студия' : `${n} комн.`}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Площадь (м²) *</label>
                      <Input 
                        type="number" 
                        step="0.1"
                        placeholder="45.5" 
                        value={unitForm.area} 
                        onChange={(e) => setUnitForm({ ...unitForm, area: e.target.value })} 
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Цена (₽) *</label>
                      <Input 
                        type="number" 
                        placeholder="7500000" 
                        value={unitForm.price} 
                        onChange={(e) => setUnitForm({ ...unitForm, price: e.target.value })} 
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Этаж</label>
                      <Input 
                        type="number" 
                        placeholder="5" 
                        value={unitForm.floor} 
                        onChange={(e) => setUnitForm({ ...unitForm, floor: e.target.value })} 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Статус</label>
                    <Select value={unitForm.status} onValueChange={(v) => setUnitForm({ ...unitForm, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="В продаже">В продаже</SelectItem>
                        <SelectItem value="Сдан">Сдан</SelectItem>
                        <SelectItem value="Забронировано">Забронировано</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Планировка (изображение)</label>
                    <Input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => setUPlan(e.target.files)} 
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                    <p className="text-xs text-muted-foreground">Рекомендуется загружать планировку квартиры</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Дополнительные фотографии</label>
                    <Input 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      onChange={(e) => setUImages(e.target.files)} 
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                    <p className="text-xs text-muted-foreground">Фотографии интерьера, вида из окна и т.д.</p>
                  </div>

                  <Button type="submit" disabled={busy} className="w-full">
                    <Plus className="mr-2" />
                    {busy ? 'Добавление...' : 'Добавить квартиру'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage" className="space-y-6">
            <AccessKeysAdmin />
            {/* Управление объектами */}
              <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Building2 className="size-5" />
                    Управление объектами ({projects.length})
                  </span>
                  <div className="flex items-center gap-2">
                    <Select value={projectBulkStatus} onValueChange={setProjectBulkStatus}>
                      <SelectTrigger className="w-[180px]"><SelectValue placeholder="Статус" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="В продаже">В продаже</SelectItem>
                        <SelectItem value="Сдан">Сдан</SelectItem>
                        <SelectItem value="Забронировано">Забронировано</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={handleBulkUpdateProjectsStatus} disabled={!selectedProjects.length}>Применить статус</Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={!selectedProjects.length}>Удалить выбранные</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Удалить выбранные объекты?</AlertDialogTitle>
                          <AlertDialogDescription>Будут удалены объекты, их квартиры и все файлы. Действие необратимо.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="flex justify-end gap-2">
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction onClick={handleBulkDeleteProjects}>Подтвердить</AlertDialogAction>
                        </div>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {projects.map(project => (
                    <div key={project.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4"
                        checked={selectedProjects.includes(project.id)}
                        onChange={(e) => {
                          setSelectedProjects((prev) => e.target.checked ? [...prev, project.id] : prev.filter(id => id !== project.id));
                        }}
                        aria-label={`Выбрать ${project.name}`}
                      />
                      <div className="space-y-1">
                        <div className="font-medium">{project.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {project.city}, {project.district} • {project.address}
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={project.status === 'В продаже' ? 'default' : 'secondary'}>
                            {project.status}
                          </Badge>
                          {project.tags?.map((tag: string) => (
                            <Badge key={tag} variant="outline">{tag}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                      <div className="flex gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/project/${project.slug}`} target="_blank" rel="noopener noreferrer">
                            <Eye className="mr-1 size-3" />
                            Просмотр
                          </Link>
                        </Button>
                        <Button asChild size="sm">
                          <Link to={`/admin/projects/${project.id}`}>Редактировать</Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              disabled={deletingProjectId === project.id}
                            >
                              <Trash2 className="mr-1 size-3" />
                              {deletingProjectId === project.id ? 'Удаление...' : 'Удалить'}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Удалить объект «{project.name}»?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Это действие удалит объект, все его квартиры и прикреплённые файлы без возможности восстановления.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="flex justify-end gap-2">
                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteProject(project.id)} disabled={deletingProjectId === project.id}>
                                Подтвердить удаление
                              </AlertDialogAction>
                            </div>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                  {projects.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Нет созданных объектов
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Управление квартирами */}
            <UnitsManagement projects={projects} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function UnitsManagement({ projects }: { projects: any[] }) {
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [deletingUnitId, setDeletingUnitId] = useState<string | null>(null);

  const loadUnits = async (projectId?: string) => {
    setLoading(true);
    let query = supabase.from('units').select(`
      *,
      projects!inner(name, slug)
    `).order('created_at', { ascending: false });
    
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    
    const { data, error } = await query;
    if (error) {
      toast({ title: 'Ошибка загрузки квартир', description: error.message });
    } else {
      setUnits(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUnits(selectedProject || undefined);
  }, [selectedProject]);

  const handleDeleteUnit = async (unit: any) => {
    setDeletingUnitId(unit.id);
    try {
      const urls: string[] = [
        ...(Array.isArray(unit.image_urls) ? unit.image_urls : []),
        ...(unit.plan_image_url ? [unit.plan_image_url] : []),
      ];
      if (urls.length) await deleteFiles('units', urls);

      const { error } = await supabase.from('units').delete().eq('id', unit.id);
      if (error) throw error;
      toast({ title: 'Квартира удалена' });
      loadUnits(selectedProject || undefined);
    } catch (err: any) {
      toast({ title: 'Ошибка удаления', description: err.message });
    } finally {
      setDeletingUnitId(null);
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="size-5" />
          Управление квартирами ({units.length})
        </CardTitle>
        <div className="flex gap-4">
          <Select value={selectedProject} onValueChange={(v) => setSelectedProject(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Все объекты" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все объекты</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Загрузка...</div>
        ) : (
          <div className="space-y-4">
            {units.map(unit => (
              <div key={unit.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="font-medium">
                    {unit.title || `${unit.rooms === 0 ? 'Студия' : `${unit.rooms}-комн.`} квартира`}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {unit.projects?.name} • {unit.area} м² • {unit.price.toLocaleString()} ₽
                    {unit.floor && ` • ${unit.floor} этаж`}
                  </div>
                  <Badge variant={unit.status === 'В продаже' ? 'default' : 'secondary'}>
                    {unit.status}
                  </Badge>
                </div>
                  <div className="flex gap-2">
                    {unit.projects?.slug && (
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/project/${unit.projects.slug}`} target="_blank" rel="noopener noreferrer">
                            <Eye className="mr-1 size-3" />
                            Объект
                          </Link>
                        </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          disabled={deletingUnitId === unit.id}
                        >
                          <Trash2 className="mr-1 size-3" />
                          {deletingUnitId === unit.id ? 'Удаление...' : 'Удалить'}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Удалить квартиру?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Это действие навсегда удалит карточку квартиры и её файлы. Отменить будет невозможно.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="flex justify-end gap-2">
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteUnit(unit)} disabled={deletingUnitId === unit.id}>
                            Подтвердить удаление
                          </AlertDialogAction>
                        </div>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
              </div>
            ))}
            {units.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {selectedProject ? 'В выбранном объекте нет квартир' : 'Нет добавленных квартир'}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}