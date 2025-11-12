import prisma from '../lib/database';
import { FastingPresetDto, FastingSessionDto, FastingEatingWindowDto } from '../types';

export class FastingService {
  // Helper to serialize BigInt to number
  private serializePreset(preset: any): FastingPresetDto {
    return {
      id: preset.id,
      userId: Number(preset.userId),
      name: preset.name,
      durationMinutes: preset.durationMinutes,
      createdAt: preset.createdAt.toISOString(),
    };
  }

  private serializeSession(session: any): FastingSessionDto {
    return {
      id: session.id,
      userId: Number(session.userId),
      startTime: session.startTime.toISOString(),
      endTime: session.endTime ? session.endTime.toISOString() : null,
      goalMinutes: session.goalMinutes,
      presetName: session.presetName,
      stoppedEarly: session.stoppedEarly,
      eatingWindowMinutes: session.eatingWindowMinutes,
      createdAt: session.createdAt.toISOString(),
    };
  }

  private serializeEatingWindow(window: any): FastingEatingWindowDto {
    return {
      id: window.id,
      userId: Number(window.userId),
      startTime: window.startTime.toISOString(),
      endTime: window.endTime ? window.endTime.toISOString() : null,
      expectedDurationMinutes: window.expectedDurationMinutes,
      nextFastDueTime: window.nextFastDueTime.toISOString(),
      createdAt: window.createdAt.toISOString(),
    };
  }

  // Presets
  async getUserPresets(userId: bigint): Promise<FastingPresetDto[]> {
    const presets = await prisma.fastingPreset.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return presets.map(this.serializePreset);
  }

  async createPreset(userId: bigint, name: string, durationMinutes: number): Promise<FastingPresetDto> {
    const preset = await prisma.fastingPreset.create({
      data: {
        userId,
        name,
        durationMinutes,
      },
    });
    return this.serializePreset(preset);
  }

  async updatePreset(id: string, name?: string, durationMinutes?: number): Promise<FastingPresetDto> {
    const preset = await prisma.fastingPreset.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(durationMinutes && { durationMinutes }),
      },
    });
    return this.serializePreset(preset);
  }

  async deletePreset(id: string): Promise<void> {
    await prisma.fastingPreset.delete({
      where: { id },
    });
  }

  // Sessions
  async getUserSessions(userId: bigint): Promise<FastingSessionDto[]> {
    const sessions = await prisma.fastingSession.findMany({
      where: { userId },
      orderBy: { startTime: 'desc' },
    });
    return sessions.map(this.serializeSession);
  }

  async getActiveSession(userId: bigint): Promise<FastingSessionDto | null> {
    const session = await prisma.fastingSession.findFirst({
      where: {
        userId,
        endTime: null,
      },
      orderBy: { startTime: 'desc' },
    });
    return session ? this.serializeSession(session) : null;
  }

  async startSession(
    userId: bigint,
    presetName: string,
    goalMinutes: number,
    eatingWindowMinutes: number
  ): Promise<FastingSessionDto> {
    const session = await prisma.fastingSession.create({
      data: {
        userId,
        startTime: new Date(),
        presetName,
        goalMinutes,
        stoppedEarly: false,
        eatingWindowMinutes,
      },
    });
    return this.serializeSession(session);
  }

  async stopSession(sessionId: string, stoppedEarly: boolean): Promise<FastingSessionDto> {
    const session = await prisma.fastingSession.update({
      where: { id: sessionId },
      data: {
        endTime: new Date(),
        stoppedEarly,
      },
    });
    return this.serializeSession(session);
  }

  // Eating Windows
  async getActiveEatingWindow(userId: bigint): Promise<FastingEatingWindowDto | null> {
    const window = await prisma.fastingEatingWindow.findFirst({
      where: {
        userId,
        endTime: null,
      },
      orderBy: { startTime: 'desc' },
    });
    return window ? this.serializeEatingWindow(window) : null;
  }

  async createEatingWindow(
    userId: bigint,
    startTime: Date,
    expectedDurationMinutes: number,
    nextFastDueTime: Date
  ): Promise<FastingEatingWindowDto> {
    const window = await prisma.fastingEatingWindow.create({
      data: {
        userId,
        startTime,
        expectedDurationMinutes,
        nextFastDueTime,
      },
    });
    return this.serializeEatingWindow(window);
  }

  async closeEatingWindow(windowId: string): Promise<FastingEatingWindowDto> {
    const window = await prisma.fastingEatingWindow.update({
      where: { id: windowId },
      data: {
        endTime: new Date(),
      },
    });
    return this.serializeEatingWindow(window);
  }
}
