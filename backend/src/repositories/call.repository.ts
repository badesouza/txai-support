import { getFirestore, Collections } from '../lib/firebase';
import { Call, CallCreateInput, CallUpdateInput, CallImage, CallImageCreateInput, PaginationResult, PaginationOptions } from '../types/models';
import { v4 as uuidv4 } from 'uuid';

const db = getFirestore();
const callsCollection = db.collection(Collections.CALLS);
const imagesCollection = db.collection(Collections.CALL_IMAGES);

export class CallRepository {
  /**
   * Create a new call
   */
  static async create(data: CallCreateInput): Promise<Call> {
    const id = uuidv4();
    const now = new Date();
    
    const call: Call = {
      id,
      title: data.title,
      description: data.description,
      status: data.status || 'OPEN',
      priority: data.priority || 'MEDIUM',
      userId: data.userId,
      userName: data.userName,
      userEmail: data.userEmail,
      userPhone: data.userPhone,
      imageUrls: [],
      createdAt: now,
      updatedAt: now,
    };

    await callsCollection.doc(id).set(call);
    await this.incrementCounter(1);
    
    return call;
  }

  /**
   * Find call by ID
   */
  static async findById(id: string): Promise<Call | null> {
    const doc = await callsCollection.doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return this.docToCall(doc);
  }

  /**
   * Find call by ID with images
   */
  static async findByIdWithImages(id: string): Promise<(Call & { images: CallImage[] }) | null> {
    const call = await this.findById(id);
    if (!call) {
      return null;
    }

    const images = await this.getCallImages(id);
    return { ...call, images };
  }

  /**
   * Find all calls with pagination
   */
  static async findMany(options: PaginationOptions & { search?: string; userId?: string } = {}): Promise<PaginationResult<Call & { images: CallImage[] }>> {
    const { page = 1, limit = 10, orderBy = 'createdAt', orderDirection = 'desc', search, userId } = options;

    // Build base query
    let query: FirebaseFirestore.Query = callsCollection;

    // Filter by userId if provided
    if (userId) {
      query = query.where('userId', '==', userId);
    }

    // Order and limit
    query = query.orderBy(orderBy, orderDirection);

    // Get total count (for the filtered query)
    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;
    const totalPages = Math.ceil(total / limit);

    // Apply pagination
    if (page > 1) {
      const offset = (page - 1) * limit;
      query = query.offset(offset);
    }
    query = query.limit(limit);

    const snapshot = await query.get();
    let calls = snapshot.docs.map(doc => this.docToCall(doc));

    // Apply search filter (client-side for Firestore)
    if (search) {
      const searchLower = search.toLowerCase();
      calls = calls.filter(call => 
        call.title.toLowerCase().includes(searchLower) ||
        call.description.toLowerCase().includes(searchLower) ||
        call.id.includes(search)
      );
    }

    // Get images for each call
    const callsWithImages = await Promise.all(
      calls.map(async (call) => {
        const images = await this.getCallImages(call.id);
        return { ...call, images };
      })
    );

    return {
      data: callsWithImages,
      total: search ? callsWithImages.length : total, // Adjust total if search was applied
      page,
      limit,
      totalPages: search ? Math.ceil(callsWithImages.length / limit) : totalPages,
    };
  }

  /**
   * Find calls by user ID
   */
  static async findByUserId(userId: string, options: PaginationOptions = {}): Promise<PaginationResult<Call>> {
    return this.findMany({ ...options, userId });
  }

  /**
   * Find active call for user (OPEN or IN_PROGRESS)
   */
  static async findActiveCallForUser(userId: string): Promise<Call | null> {
    const snapshot = await callsCollection
      .where('userId', '==', userId)
      .where('status', 'in', ['OPEN', 'IN_PROGRESS'])
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return this.docToCall(snapshot.docs[0]);
  }

  /**
   * Update call
   */
  static async update(id: string, data: CallUpdateInput): Promise<Call | null> {
    const docRef = callsCollection.doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return null;
    }

    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    await docRef.update(updateData);
    
    const updated = await docRef.get();
    return this.docToCall(updated);
  }

  /**
   * Delete call and its images
   */
  static async delete(id: string): Promise<boolean> {
    const docRef = callsCollection.doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return false;
    }

    // Delete associated images
    const imagesSnapshot = await imagesCollection
      .where('callId', '==', id)
      .get();
    
    const batch = db.batch();
    imagesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    batch.delete(docRef);
    await batch.commit();

    await this.incrementCounter(-1);
    
    return true;
  }

  /**
   * Add image to call
   */
  static async addImage(data: CallImageCreateInput): Promise<CallImage> {
    const id = uuidv4();
    const now = new Date();
    
    const image: CallImage = {
      id,
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    await imagesCollection.doc(id).set(image);
    
    // Update call's imageUrls array
    const callRef = callsCollection.doc(data.callId);
    const callDoc = await callRef.get();
    if (callDoc.exists) {
      const currentUrls = callDoc.data()?.imageUrls || [];
      await callRef.update({
        imageUrls: [...currentUrls, data.path],
        updatedAt: now,
      });
    }
    
    return image;
  }

  /**
   * Get images for a call
   */
  static async getCallImages(callId: string): Promise<CallImage[]> {
    const snapshot = await imagesCollection
      .where('callId', '==', callId)
      .orderBy('createdAt', 'asc')
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      filename: doc.data().filename,
      path: doc.data().path,
      callId: doc.data().callId,
      createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
      updatedAt: doc.data().updatedAt?.toDate?.() || new Date(doc.data().updatedAt),
    }));
  }

  /**
   * Delete image
   */
  static async deleteImage(imageId: string): Promise<CallImage | null> {
    const docRef = imagesCollection.doc(imageId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return null;
    }

    const image: CallImage = {
      id: doc.id,
      filename: doc.data()!.filename,
      path: doc.data()!.path,
      callId: doc.data()!.callId,
      createdAt: doc.data()!.createdAt?.toDate?.() || new Date(doc.data()!.createdAt),
      updatedAt: doc.data()!.updatedAt?.toDate?.() || new Date(doc.data()!.updatedAt),
    };

    await docRef.delete();
    
    // Update call's imageUrls array
    const callRef = callsCollection.doc(image.callId);
    const callDoc = await callRef.get();
    if (callDoc.exists) {
      const currentUrls = callDoc.data()?.imageUrls || [];
      await callRef.update({
        imageUrls: currentUrls.filter((url: string) => url !== image.path),
        updatedAt: new Date(),
      });
    }
    
    return image;
  }

  /**
   * Find image by ID
   */
  static async findImageById(imageId: string): Promise<CallImage | null> {
    const doc = await imagesCollection.doc(imageId).get();
    if (!doc.exists) {
      return null;
    }
    return {
      id: doc.id,
      filename: doc.data()!.filename,
      path: doc.data()!.path,
      callId: doc.data()!.callId,
      createdAt: doc.data()!.createdAt?.toDate?.() || new Date(doc.data()!.createdAt),
      updatedAt: doc.data()!.updatedAt?.toDate?.() || new Date(doc.data()!.updatedAt),
    };
  }

  /**
   * Get total count
   */
  static async getCount(): Promise<number> {
    const counterDoc = await db.collection(Collections.COUNTERS).doc('calls').get();
    if (!counterDoc.exists) {
      const snapshot = await callsCollection.count().get();
      const count = snapshot.data().count;
      await db.collection(Collections.COUNTERS).doc('calls').set({ count });
      return count;
    }
    return counterDoc.data()?.count || 0;
  }

  /**
   * Increment counter
   */
  private static async incrementCounter(delta: number): Promise<void> {
    const counterRef = db.collection(Collections.COUNTERS).doc('calls');
    await db.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      const currentCount = counterDoc.exists ? (counterDoc.data()?.count || 0) : 0;
      transaction.set(counterRef, { count: Math.max(0, currentCount + delta) });
    });
  }

  /**
   * Convert Firestore document to Call
   */
  private static docToCall(doc: FirebaseFirestore.DocumentSnapshot): Call {
    const data = doc.data()!;
    return {
      id: doc.id,
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      userId: data.userId,
      userName: data.userName,
      userEmail: data.userEmail,
      userPhone: data.userPhone,
      imageUrls: data.imageUrls || [],
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
    };
  }
}

