// Mock for Firebase

export const firestore = {
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(),
};

export const auth = {
  currentUser: null,
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
};

export const serverTimestamp = jest.fn(() => new Date());

// Helper to reset mocks
export const resetFirebaseMocks = () => {
  Object.values(firestore).forEach((fn) => {
    if (typeof fn === 'function' && fn.mockClear) {
      fn.mockClear();
    }
  });
  Object.values(auth).forEach((fn) => {
    if (typeof fn === 'function' && fn.mockClear) {
      fn.mockClear();
    }
  });
};

