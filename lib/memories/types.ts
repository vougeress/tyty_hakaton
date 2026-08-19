export type PhotoDateSource = "exif" | "manual" | "fileModifiedAt" | "unknown";

export type PhotoCalendarBinding = {
  calendarDay: string | null;
  eventId: string | null;
  eventTitle: string | null;
};

export type PhotoRecord = PhotoCalendarBinding & {
  id: string;
  tripId: string;
  originalFilename: string;
  contentType: string;
  storagePath: string;
  size: number;
  checksumSha256: string;
  authorId: string | null;
  authorName: string;
  takenAt: string | null;
  dateSource: PhotoDateSource;
  createdAt: string;
};

export type PhotoListFilters = {
  authorId?: string;
  day?: string;
  eventId?: string;
};

export type UploadPhotoInput = {
  tripId: string;
  file: File;
  authorId?: string;
  authorName?: string;
  takenAt?: string;
};
