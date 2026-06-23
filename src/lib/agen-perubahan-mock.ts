import {
  agenPerubahan,
  agenPerubahanInovasi,
  getAgenPerubahanFoto,
} from "./data.js";

export type AgenPerubahanHasil = {
  sebelum: {
    foto: string;
    deskripsi: string;
  };
  sesudah: {
    foto: string;
    deskripsi: string;
  };
};

export type AgenPerubahanItem = {
  id: string;
  nama: string;
  jabatan: string;
  unitKerja: string;
  tahun: number;
  foto: string;
  inovasi: string;
  deskripsi: string;
  latarBelakang: string;
  tujuan: string[];
  hasil: AgenPerubahanHasil[];
  updatedAt?: string;
};

export function getAgenPerubahanMockList(): AgenPerubahanItem[] {
  return agenPerubahan.map((agent) => {
    const innovation =
      agenPerubahanInovasi.find(
        (item) => Number(item.relatedTo) === Number(agent.id),
      ) ?? null;

    return {
      id: String(agent.id),
      nama: String(agent.nama ?? ""),
      jabatan: String(agent.jabatan ?? ""),
      unitKerja: String(agent.unitKerja ?? ""),
      tahun: Number(agent.tahun ?? new Date().getFullYear()),
      foto: String(getAgenPerubahanFoto(agent) ?? ""),
      inovasi: String(innovation?.inovasi ?? agent.inovasi ?? ""),
      deskripsi: String(agent.deskripsi ?? ""),
      latarBelakang: String(innovation?.latarBelakang ?? ""),
      tujuan: Array.isArray(innovation?.tujuan)
        ? innovation.tujuan.map((item) => String(item ?? ""))
        : [],
      hasil: Array.isArray(innovation?.hasil)
        ? innovation.hasil.map((item) => ({
            sebelum: {
              foto: String(item?.sebelum?.foto ?? ""),
              deskripsi: String(item?.sebelum?.deskripsi ?? ""),
            },
            sesudah: {
              foto: String(item?.sesudah?.foto ?? ""),
              deskripsi: String(item?.sesudah?.deskripsi ?? ""),
            },
          }))
        : [],
      updatedAt: undefined,
    };
  });
}

export function getAgenPerubahanMockById(id: string | undefined | null) {
  if (!id) return null;
  return getAgenPerubahanMockList().find((item) => item.id === String(id)) ?? null;
}
