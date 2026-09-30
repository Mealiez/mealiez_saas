import { NextRequest } from 'next/server';
import { POST as createSession } from '@/app/api/attendance/sessions/route';
import { PATCH as syncLocation } from '@/app/api/attendance/sessions/[id]/location/route';
import { POST as markAttendance } from '@/app/api/attendance/mark/route';

// Mocks
jest.mock('@/lib/auth/session', () => ({
  getCurrentUser: jest.fn(),
}));
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));
jest.mock('@/lib/attendance/token', () => ({
  verifyQRToken: jest.fn(),
  generateQRToken: jest.fn().mockReturnValue('mock-qr-token'),
}));
jest.mock('@/lib/features/gate', () => ({
  checkFeatureEnabled: jest.fn().mockResolvedValue(true),
}));

const { getCurrentUser } = require('@/lib/auth/session');
const { createClient } = require('@/lib/supabase/server');
const { verifyQRToken } = require('@/lib/attendance/token');

describe('Admin-Sourced GPS Attendance Workflow', () => {
  const adminUser = { id: 'admin-id', role: 'admin', tenant_id: 'tenant-1' };
  const workerUser = { id: 'worker-id', role: 'member', tenant_id: 'tenant-1' };
  
  let mockQuery: any;
  let supabaseMock: any;
  let mockSessionId = 'session-123';
  let mockToken = 'qr-token-abc';
  let mockChannelId = 'channel-999';

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockQuery = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn(),
    };

    supabaseMock = {
      from: jest.fn().mockReturnValue(mockQuery),
      rpc: jest.fn(),
    };
    
    createClient.mockResolvedValue(supabaseMock);
  });

  it('Step 1: Admin creates a Channel-based Attendance Session', async () => {
    getCurrentUser.mockResolvedValue(adminUser);
    
    mockQuery.maybeSingle.mockResolvedValue({
      data: null,
      error: null
    });
    
    mockQuery.single.mockResolvedValue({
      data: { id: mockSessionId, label: 'Morning Shift' },
      error: null
    });

    const req = new NextRequest('http://localhost:3000/api/attendance/sessions', {
      method: 'POST',
      body: JSON.stringify({
        session_date: '2026-10-15',
        meal_type: 'breakfast',
        label: 'Morning Shift',
        attendance_mode: 'CHANNEL',
        project_name: 'Project Alpha'
      })
    });

    const res = await createSession(req);
    expect(res.status).toBe(201);
    
    const json = await res.json();
    expect(json.session.id).toBe(mockSessionId);
    
    expect(supabaseMock.from).toHaveBeenCalledWith('attendance_sessions');
    expect(mockQuery.insert).toHaveBeenCalledWith(expect.objectContaining({
      attendance_mode: 'CHANNEL',
      project_name: 'Project Alpha'
    }));
  });

  it('Step 2: Admin device syncs its GPS location to the session', async () => {
    getCurrentUser.mockResolvedValue(adminUser);
    
    mockQuery.single.mockResolvedValueOnce({
      data: { id: mockSessionId, tenant_id: adminUser.tenant_id },
      error: null
    });
    
    mockQuery.update.mockReturnValueOnce(mockQuery);

    const req = new NextRequest(`http://localhost:3000/api/attendance/sessions/${mockSessionId}/location`, {
      method: 'PATCH',
      body: JSON.stringify({
        latitude: 18.5204,
        longitude: 73.8567,
        accuracy: 10
      })
    });

    const res = await syncLocation(req, { params: { id: mockSessionId } });
    expect(res.status).toBe(200);

    expect(mockQuery.update).toHaveBeenCalledWith(expect.objectContaining({
      admin_latitude: 18.5204,
      admin_longitude: 73.8567,
      admin_accuracy: 10
    }));
  });

  it('Step 3: Worker scans QR and attendance is marked using Admin coordinates', async () => {
    getCurrentUser.mockResolvedValue(workerUser);
    
    verifyQRToken.mockReturnValue({
      valid: true,
      payload: { session_id: mockSessionId, tenant_id: workerUser.tenant_id, meal_type: 'breakfast' }
    });

    mockQuery.single.mockResolvedValueOnce({
      data: {
        id: mockSessionId,
        is_active: true,
        attendance_mode: 'CHANNEL',
        admin_latitude: 18.5204,
        admin_longitude: 73.8567,
        admin_accuracy: 10,
        admin_location_updated_at: new Date().toISOString()
      },
      error: null
    });

    mockQuery.single.mockResolvedValueOnce({
      data: { channel_id: mockChannelId },
      error: null
    });

    supabaseMock.rpc.mockResolvedValueOnce({
      data: mockChannelId,
      error: null
    });

    mockQuery.single.mockResolvedValueOnce({
      data: { marked_at: new Date().toISOString() },
      error: null
    });

    const req = new NextRequest('http://localhost:3000/api/attendance/mark', {
      method: 'POST',
      body: JSON.stringify({ session_token: mockToken })
    });

    const res = await markAttendance(req);
    expect(res.status).toBe(201);
    
    const json = await res.json();
    expect(json.success).toBe(true);

    expect(supabaseMock.rpc).toHaveBeenCalledWith('detect_channel', expect.objectContaining({
      p_latitude: 18.5204,
      p_longitude: 73.8567
    }));

    expect(mockQuery.insert).toHaveBeenCalledWith(expect.objectContaining({
      latitude: 18.5204,
      longitude: 73.8567,
      gps_accuracy: 10,
      assigned_channel_id: mockChannelId,
      detected_channel_id: mockChannelId,
      verification_status: 'VERIFIED'
    }));
  });
});
