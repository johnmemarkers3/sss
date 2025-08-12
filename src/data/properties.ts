import img1 from "@/assets/property-1.jpg";
import img2 from "@/assets/property-2.jpg";
import img3 from "@/assets/property-3.jpg";
import img4 from "@/assets/property-4.jpg";

export type PropertyItem = {
  id: string;
  title: string;
  address: string;
  city: string;
  district: string;
  status: "В продаже" | "Сдан" | "Забронировано";
  priceMin: number;
  priceMax: number;
  areaMin: number;
  areaMax: number;
  rooms: number; // основной тип
  deadline?: string;
  tags?: string[];
  amenities?: string[];
  coords?: { lat: number; lng: number };
  images: string[];
  description?: string;
};

export const cities = ["Москва", "Санкт-Петербург", "Казань"] as const;
export const districts = ["Центральный", "Северный", "Южный", "Восточный", "Западный"] as const;

export const properties: PropertyItem[] = [
  {
    id: "p1",
    title: "Skyline Residence",
    address: "ул. Набережная, 12",
    city: "Москва",
    district: "Центральный",
    status: "В продаже",
    priceMin: 8500000,
    priceMax: 22000000,
    areaMin: 35,
    areaMax: 120,
    rooms: 2,
    deadline: "Q4 2025",
    tags: ["Скоро сдача"],
    amenities: ["Балкон", "Паркинг", "Вид на парк"],
    coords: { lat: 55.7558, lng: 37.6173 },
    images: [img1, img2, img3],
    description: "Современный комплекс в центре города с развитой инфраструктурой.",
  },
  {
    id: "p2",
    title: "ParkView Apartments",
    address: "пр-т Мира, 7",
    city: "Москва",
    district: "Северный",
    status: "Сдан",
    priceMin: 6500000,
    priceMax: 15000000,
    areaMin: 28,
    areaMax: 95,
    rooms: 1,
    tags: ["Акция"],
    amenities: ["Гардеробная", "Паркинг"],
    coords: { lat: 55.85, lng: 37.6 },
    images: [img2, img1, img4],
    description: "Дом бизнес-класса у парка. Последние квартиры по специальной цене.",
  },
  {
    id: "p3",
    title: "Riverside House",
    address: "ул. Береговая, 3",
    city: "Санкт-Петербург",
    district: "Западный",
    status: "В продаже",
    priceMin: 9500000,
    priceMax: 26000000,
    areaMin: 45,
    areaMax: 130,
    rooms: 3,
    tags: ["Последние квартиры"],
    amenities: ["Балкон", "Вид на воду"],
    coords: { lat: 59.93, lng: 30.33 },
    images: [img3, img2, img1],
    description: "Элегантный дом у набережной с панорамными окнами.",
  },
  {
    id: "p4",
    title: "Green Quarter",
    address: "ул. Лесная, 21",
    city: "Казань",
    district: "Восточный",
    status: "Забронировано",
    priceMin: 5200000,
    priceMax: 12000000,
    areaMin: 25,
    areaMax: 85,
    rooms: 2,
    tags: ["Акция"],
    amenities: ["Детская площадка", "Паркинг"],
    coords: { lat: 55.79, lng: 49.12 },
    images: [img4, img1, img2],
    description: "Экологичный квартал рядом с лесопарком.",
  },
  // дополнительные элементы для заполнения сетки
  ...Array.from({ length: 8 }).map((_, i) => ({
    id: `p${5 + i}`,
    title: `Residence ${i + 5}`,
    address: `ул. Примерная, ${10 + i}`,
    city: cities[i % cities.length],
    district: districts[i % districts.length],
    status: ([("В продаже"), ("Сдан"), ("Забронировано")] as const)[i % 3],
    priceMin: 4000000 + i * 300000,
    priceMax: 12000000 + i * 600000,
    areaMin: 24 + i,
    areaMax: 95 + i,
    rooms: (i % 4) + 1,
    tags: i % 2 ? ["Скоро сдача"] : undefined,
    amenities: ["Балкон"],
    images: [img1, img2, img3, img4],
    description: "Комфорт по разумной цене.",
  }))
];
