import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAddDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockCollection = vi.fn();
const mockQuery = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockServerTimestamp = vi.fn(() => ({ _type: 'serverTimestamp' }));
const mockGetFirestore = vi.fn(() => ({}));

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/firestore', () => ({
  getFirestore: mockGetFirestore,
  collection: mockCollection,
  addDoc: mockAddDoc,
  getDocs: mockGetDocs,
  query: mockQuery,
  orderBy: mockOrderBy,
  limit: mockLimit,
  serverTimestamp: mockServerTimestamp,
}));

const { addScore, getTopScores } = await import('./firebase.ts');

describe('addScore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollection.mockReturnValue('colRef');
    mockAddDoc.mockResolvedValue({});
  });

  it('calls addDoc with correct collection path and fields', async () => {
    await addScore('user1', 1000, 'My Video');
    expect(mockCollection).toHaveBeenCalledWith({}, 'scores', 'user1', 'entries');
    expect(mockAddDoc).toHaveBeenCalledWith('colRef', {
      score: 1000,
      videoTitle: 'My Video',
      playedAt: { _type: 'serverTimestamp' },
    });
  });

  it('includes serverTimestamp() in the data', async () => {
    await addScore('u1', 500, '');
    const data = mockAddDoc.mock.calls[0][1];
    expect(data.playedAt).toEqual({ _type: 'serverTimestamp' });
  });

  it('rethrows Firestore unavailable error', async () => {
    const err = Object.assign(new Error('unavailable'), { code: 'unavailable' });
    mockAddDoc.mockRejectedValue(err);
    await expect(addScore('u1', 0, '')).rejects.toThrow('unavailable');
  });

  it('rethrows permission-denied error', async () => {
    const err = Object.assign(new Error('permission-denied'), { code: 'permission-denied' });
    mockAddDoc.mockRejectedValue(err);
    await expect(addScore('u1', 0, '')).rejects.toThrow('permission-denied');
  });
});

describe('getTopScores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollection.mockReturnValue('colRef');
    mockQuery.mockReturnValue('queryRef');
    mockOrderBy.mockReturnValue('orderRef');
    mockLimit.mockReturnValue('limitRef');
  });

  it('returns [] for empty snapshot', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    const result = await getTopScores('u1');
    expect(result).toEqual([]);
  });

  it('returns 10 entries ordered by score desc', async () => {
    const scores = [100,90,80,70,60,50,40,30,20,10];
    mockGetDocs.mockResolvedValue({
      docs: scores.map((s, i) => ({
        data: () => ({
          score: s,
          videoTitle: `Video ${i}`,
          playedAt: { toDate: () => new Date(2024, 0, i + 1) },
        }),
      })),
    });
    const result = await getTopScores('u1');
    expect(result).toHaveLength(10);
    expect(result[0].score).toBeGreaterThanOrEqual(result[9].score);
  });

  it('maps Timestamp.toDate() to Date', async () => {
    const d = new Date(2024, 5, 15);
    mockGetDocs.mockResolvedValue({
      docs: [{
        data: () => ({ score: 42, videoTitle: 'T', playedAt: { toDate: () => d } }),
      }],
    });
    const result = await getTopScores('u1');
    expect(result[0].playedAt).toBeInstanceOf(Date);
    expect(result[0].playedAt).toEqual(d);
  });

  it('uses new Date() fallback when toDate is absent', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [{
        data: () => ({ score: 1, videoTitle: '', playedAt: null }),
      }],
    });
    const result = await getTopScores('u1');
    expect(result[0].playedAt).toBeInstanceOf(Date);
  });

  it('rethrows unavailable error', async () => {
    const err = Object.assign(new Error('unavailable'), { code: 'unavailable' });
    mockGetDocs.mockRejectedValue(err);
    await expect(getTopScores('u1')).rejects.toThrow('unavailable');
  });
});
