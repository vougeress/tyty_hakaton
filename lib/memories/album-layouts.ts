export type AlbumSlot = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type AlbumLayout = {
  id: "single_1" | "duo_2" | "hero_3" | "grid_4";
  title: string;
  minPhotos: number;
  maxPhotos: number;
  slots: AlbumSlot[];
};

export const albumLayouts: AlbumLayout[] = [
  {
    id: "single_1",
    title: "Один большой кадр",
    minPhotos: 1,
    maxPhotos: 1,
    slots: [
      { x: 6, y: 13, w: 88, h: 79 }
    ]
  },
  {
    id: "duo_2",
    title: "Два крупных кадра",
    minPhotos: 2,
    maxPhotos: 2,
    slots: [
      { x: 6, y: 13, w: 88, h: 38 },
      { x: 6, y: 54, w: 88, h: 38 }
    ]
  },
  {
    id: "hero_3",
    title: "Большой кадр и два продолжения",
    minPhotos: 3,
    maxPhotos: 3,
    slots: [
      { x: 6, y: 13, w: 88, h: 48 },
      { x: 6, y: 64, w: 42.5, h: 28 },
      { x: 51.5, y: 64, w: 42.5, h: 28 }
    ]
  },
  {
    id: "grid_4",
    title: "Четыре крупных кадра",
    minPhotos: 4,
    maxPhotos: 4,
    slots: [
      { x: 6, y: 13, w: 42.5, h: 38 },
      { x: 51.5, y: 13, w: 42.5, h: 38 },
      { x: 6, y: 54, w: 42.5, h: 38 },
      { x: 51.5, y: 54, w: 42.5, h: 38 }
    ]
  }
];

export function selectAlbumLayout(photoCount: number) {
  return albumLayouts.find((layout) => photoCount >= layout.minPhotos && photoCount <= layout.maxPhotos)
    ?? albumLayouts[0];
}
