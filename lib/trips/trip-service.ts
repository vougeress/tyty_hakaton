import { randomBytes } from "node:crypto";

import { z } from "zod";

import type { CreateEventInput, CreateTripInput, JoinTripInput } from "@/lib/trips/contracts";
import type { TripRepository } from "@/lib/trips/repository";

const personSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  avatarUrl: z.url().optional()
});

const createTripSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    timezone: z.string().trim().min(1).max(80),
    startsAt: z.date(),
    endsAt: z.date(),
    owner: personSchema
  })
  .refine((value) => value.endsAt > value.startsAt, {
    message: "Trip end must be after its start",
    path: ["endsAt"]
  });

const joinTripSchema = z.object({
  inviteCode: z.string().trim().min(4).max(32).transform((value) => value.toUpperCase()),
  participant: personSchema
});

export class TripService {
  constructor(private readonly repository: TripRepository) {}

  async createTrip(input: CreateTripInput) {
    const validated = createTripSchema.parse(input);
    return this.repository.create({ ...validated, inviteCode: this.createInviteCode() });
  }

  async joinTrip(input: JoinTripInput) {
    return this.repository.join(joinTripSchema.parse(input));
  }

  async getTrip(id: string) {
    return this.repository.findById(z.uuid().parse(id));
  }

  async getTimeline(tripId: string) {
    return this.repository.listEvents(z.uuid().parse(tripId));
  }

  async addEvent(input: CreateEventInput) {
    if (input.endsAt <= input.startsAt) throw new Error("Event end must be after its start");
    return this.repository.createEvent(input);
  }

  private createInviteCode() {
    return randomBytes(5).toString("hex").toUpperCase();
  }
}
