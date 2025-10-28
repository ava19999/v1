// App.tsx
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { GoogleOAuthProvider, CredentialResponse } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

// --- Impor Firebase Auth ---
import {
  getAuth,
  onAuthStateChanged,
  signOut, // Tambahkan signOut
  GoogleAuthProvider, // Tambahkan provider Google
  signInWithCredential, // Tambahkan signInWithCredential
  User as FirebaseUser // Ganti nama agar tidak konflik
} from "firebase/auth";
// --- Akhir Impor Firebase Auth ---

import Header from './components/Header';
import Footer from './components/Footer';
import type { ForumMessageItem, Room, CoinListItem, CryptoData, ChatMessage, Page, Currency, NewsArticle, User, GoogleProfile } from './types';
import { isNewsArticle, isChatMessage } from './types';
// ... (impor komponen lainnya) ...
import { fetchIdrRate, fetchNewsArticles, fetchTop500Coins, fetchTrendingCoins, fetchCoinDetails } from './services/mockData';
import { ADMIN_USERNAMES } from './components/UserTag';
import { database } from './services/firebaseService';
import { ref, set, push, onValue, off, update, get } from "firebase/database";

// ... (Konstanta DEFAULT_ROOM_IDS, defaultMessages, Particles) ...

const AppContent = () => {
  // ... (state lainnya tetap sama) ...
  const [users, setUsers] = useState<{ [email: string]: User }>({});
  const [currentUser, setCurrentUser] = useState<User | null>(null); // State user aplikasi
  const [pendingGoogleUser, setPendingGoogleUser] = useState<GoogleProfile | null>(null);
  // --- State Baru untuk Firebase Auth ---
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null); // State user Firebase Auth
  const [authError, setAuthError] = useState<string | null>(null); // State untuk error auth Firebase
  const [isAuthLoading, setIsAuthLoading] = useState(true); // State loading untuk auth awal
  // --- Akhir State Baru ---

  // ... (handler fetchTrendingData, handleResetToTrending) ...

  // --- Effect untuk Firebase Auth Listener ---
  useEffect(() => {
    const auth = getAuth(); // Dapatkan instance Auth
    setIsAuthLoading(true); // Mulai loading
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Firebase Auth State Changed:", user ? `Logged in as ${user.uid}` : "Logged out"); // Logging
      setFirebaseUser(user); // Set state firebaseUser

      if (user) {
        // Jika user Firebase login, coba cari/set currentUser aplikasi
        const appUser = Object.values(users).find(u => u.email === user.email);
        if (appUser) {
          if (!currentUser || currentUser.email !== appUser.email) {
            console.log("Setting currentUser from Firebase Auth:", appUser);
            setCurrentUser(appUser); // Set currentUser jika belum atau berbeda
          }
        } else {
          // Kasus: User login di Firebase tapi belum ada di state 'users' aplikasi
          // Ini bisa terjadi jika data local storage hilang atau saat pertama kali login
          // Kita bisa mengarahkan ke halaman pembuatan profil jika username belum ada
          // Atau membuat user baru di state 'users' jika data dari Firebase cukup
          console.warn(`Firebase user ${user.email} not found in local 'users' state.`);
          // Jika perlu, tambahkan logika untuk menangani kasus ini,
          // misalnya, membuat user baru di 'users' atau mengarahkan ke create profile
          // Contoh sederhana: Jika punya display name, coba buat user sementara
          if (user.displayName && user.email) {
             const potentialNewUser: User = { email: user.email, username: user.displayName, createdAt: Date.now() /* mungkin perlu data lain */ };
             // Cek lagi apakah user baru ini ada di state 'users' setelah potensi update state sebelumnya
             if (!users[user.email]) {
                  console.log("Creating temporary user entry in 'users' state from Firebase Auth.");
                  setUsers(prev => ({ ...prev, [potentialNewUser.email]: potentialNewUser }));
             }
             if (!currentUser) {
                  setCurrentUser(potentialNewUser);
             }

          } else if (!pendingGoogleUser) {
            // Jika tidak ada data yg cukup dan tidak sedang menunggu profil Google
            setCurrentUser(null); // Pastikan logout jika data tidak lengkap
          }
        }
      } else {
        // Jika user Firebase logout
        if (currentUser !== null) {
          console.log("Clearing currentUser due to Firebase Auth logout.");
          setCurrentUser(null); // Logout state aplikasi
        }
        setPendingGoogleUser(null); // Hapus juga user google yg pending
      }
      setIsAuthLoading(false); // Selesai loading
    });

    return () => unsubscribe(); // Cleanup listener
  }, [users, currentUser, pendingGoogleUser]); // Tambahkan currentUser & pendingGoogleUser ke dependency

  // ... (Effect lainnya untuk localStorage, IDR rate, coin list, trending, unread, analysis counts, news) ...

  // --- Auth Handlers (Diperbarui) ---

  // Handle Sukses Login Google dari @react-oauth/google
  const handleGoogleRegisterSuccess = useCallback(async (credentialResponse: CredentialResponse) => {
    setAuthError(null); // Reset error
    if (!credentialResponse.credential) {
        setAuthError("Credential Google tidak ditemukan.");
        return;
    }
    try {
        const decoded: { email: string; name: string; picture: string; } = jwtDecode(credentialResponse.credential);
        const { email, name, picture } = decoded;

        // ---- INTEGRASI FIREBASE AUTH ----
        console.log("Google Sign-In Success, attempting Firebase link...");
        const auth = getAuth();
        // Buat kredensial Google untuk Firebase
        const googleCredential = GoogleAuthProvider.credential(credentialResponse.credential);

        // Coba sign in ke Firebase dengan kredensial Google
        signInWithCredential(auth, googleCredential)
          .then((userCredential) => {
             // Pengguna BERHASIL login ke Firebase Auth
             const firebaseAuthUser = userCredential.user;
             console.log("Firebase signInWithCredential success:", firebaseAuthUser);
             setFirebaseUser(firebaseAuthUser); // Update state firebaseUser

             // Lanjutkan logika aplikasi Anda (cek user di state 'users', dll.)
             const existingUser = Object.values(users).find(u => u.email === email); // Cari berdasarkan email
             if (existingUser) {
                  console.log("Existing user found in 'users' state, setting as currentUser.");
                  setCurrentUser(existingUser); // Langsung login jika user aplikasi sudah ada
                  setPendingGoogleUser(null); // Pastikan tidak ada pending user
             } else {
                  console.log("New user via Google, setting pendingGoogleUser for profile creation.");
                  // User baru via Google, perlu buat username & password aplikasi
                  setPendingGoogleUser({ email, name, picture });
                  // currentUser akan null sampai profil selesai dibuat
                  setCurrentUser(null);
             }
          })
          .catch((error) => {
             console.error("Firebase signInWithCredential error:", error);
             // Tampilkan error spesifik jika memungkinkan
             let errMsg = "Gagal menghubungkan login Google ke Firebase.";
             if (error.code === 'auth/account-exists-with-different-credential') {
                errMsg = "Akun dengan email ini sudah ada, login dengan metode sebelumnya.";
             } else if (error.message) {
                 errMsg += ` (${error.message})`;
             }
             setAuthError(errMsg);
             setFirebaseUser(null); // Pastikan firebaseUser null jika gagal
             setCurrentUser(null); // Pastikan currentUser null jika gagal
          });
        // ---- AKHIR INTEGRASI ----

    } catch (error) {
        console.error("Google login decode/Firebase error:", error);
        setAuthError("Terjadi kesalahan saat memproses login Google.");
        setFirebaseUser(null);
        setCurrentUser(null);
    }
  }, [users]); // 'users' adalah dependency

  // Handle Login Manual (Tetap Sama)
  const handleLogin = useCallback(async (usernameOrEmail: string, password: string): Promise<string | void> => {
    setAuthError(null);
    const user = Object.values(users).find(u =>
        u.username.toLowerCase() === usernameOrEmail.toLowerCase() ||
        u.email.toLowerCase() === usernameOrEmail.toLowerCase()
    );

    if (user && user.password === password) {
        // --- TODO: Implementasikan login manual ke Firebase Auth jika diperlukan ---
        // Jika Anda ingin user login manual juga terautentikasi di Firebase (misal pakai email/password auth),
        // Anda perlu memanggil `signInWithEmailAndPassword(auth, user.email, password)` di sini.
        // Untuk saat ini, kita anggap login manual hanya mengubah state aplikasi.
        console.log("Manual login successful, setting currentUser:", user);
        setCurrentUser(user);
        // Jika login manual ke Firebase Auth diimplementasikan, firebaseUser akan diupdate oleh onAuthStateChanged
    } else {
        const errorMsg = 'Username/email atau kata sandi salah.';
        setAuthError(errorMsg);
        return errorMsg;
    }
  }, [users]);

  // Handle Penyelesaian Profil (setelah login Google untuk user baru)
  const handleProfileComplete = useCallback(async (username: string, password: string): Promise<string | void> => {
    setAuthError(null);
    if (!pendingGoogleUser) return 'Data Google tidak ditemukan.';
    // Pastikan user Firebase sudah login (seharusnya sudah dari handleGoogleRegisterSuccess)
    if (!firebaseUser) return 'Sesi login Firebase tidak aktif. Coba login ulang.';

    if (Object.values(users).some(u => u.username.toLowerCase() === username.toLowerCase())) {
        const errorMsg = 'Username sudah digunakan. Pilih nama lain.';
        setAuthError(errorMsg);
        return errorMsg;
    }
    const newUser: User = {
        email: pendingGoogleUser.email,
        username: username,
        password: password, // Simpan password (pertimbangkan keamanan di produksi)
        googleProfilePicture: pendingGoogleUser.picture,
        createdAt: Date.now()
    };
    console.log("Profile complete, creating new user in 'users' state:", newUser);
    setUsers(prev => ({ ...prev, [newUser.email]: newUser }));
    setCurrentUser(newUser); // Set user aplikasi yang baru dibuat
    setPendingGoogleUser(null); // Hapus pending user
    // firebaseUser sudah ter-set dari langkah login Google sebelumnya
  }, [users, pendingGoogleUser, firebaseUser]);

  // Handle Logout (Tambahkan Firebase Sign Out)
  const handleLogout = useCallback(() => {
    console.log("handleLogout called");
    const auth = getAuth();
    signOut(auth).then(() => {
        console.log("Firebase signOut successful");
        // onAuthStateChanged akan menangani setFirebaseUser(null) dan setCurrentUser(null)
    }).catch((error) => {
        console.error("Firebase signOut error:", error);
        // Tetap coba logout state aplikasi meskipun Firebase gagal
        setCurrentUser(null);
        setFirebaseUser(null);
    });
    // Pindahkan ke halaman home setelah logout
    setActivePage('home');
  }, []);

  // ... (handler app logic lainnya: increment, navigate, selectCoin, join/leave/create/delete room) ...

  // --- Firebase Chat Logic (Diperbarui) ---

  // Handle Send Message (Sertakan UID)
  const handleSendMessage = useCallback((message: Omit<ChatMessage, 'id' | 'uid'>) => {
    // Validasi Awal
    if (!database) { console.error("DB null"); alert("Error: Database tidak terhubung."); return; }
    if (!currentRoom?.id) { console.error("currentRoom null"); alert("Error: Room tidak valid."); return; }
    // Gunakan firebaseUser dari state untuk UID dan validasi login Firebase
    if (!firebaseUser?.uid) { console.error("firebaseUser null"); alert("Error: Anda belum login ke sistem."); return; }
    // Gunakan currentUser dari state untuk username aplikasi
    if (!currentUser?.username) { console.error("currentUser null"); alert("Error: Username aplikasi tidak ditemukan."); return; }

    const messageToSend: Omit<ChatMessage, 'id'> = {
         type: 'user',
         uid: firebaseUser.uid, // Sertakan UID Firebase Auth
         sender: currentUser.username, // Username aplikasi
         timestamp: Date.now(),
         reactions: {},
         ...(message.text && { text: message.text }),
         ...(message.fileURL && { fileURL: message.fileURL }),
         ...(message.fileName && { fileName: message.fileName }),
    };

    if (!messageToSend.text && !messageToSend.fileURL) { console.warn("Pesan kosong dicegah."); return; }

    const messageListRef = ref(database, `messages/${currentRoom.id}`);
    const newMessageRef = push(messageListRef);

    console.log(`Sending message to DB: messages/${currentRoom.id}/${newMessageRef.key}`, messageToSend);

    set(newMessageRef, messageToSend)
        .then(() => { console.log("Pesan berhasil dikirim."); })
        .catch((error) => {
            console.error("Firebase send message error:", error);
            let alertMessage = "Gagal mengirim pesan.";
            if (error.code === 'PERMISSION_DENIED') {
                 alertMessage += " Akses ditolak oleh server. Pastikan Anda login dan aturan keamanan benar.";
            } else if (error.message) {
                alertMessage += ` (${error.message})`;
            }
            alert(alertMessage);
        });

  }, [currentRoom, currentUser, database, firebaseUser]); // Tambahkan firebaseUser dependency

  // ... (useEffect untuk listener pesan Firebase, Fetch News) ...
  // ... (handleReaction, handleDeleteMessage) ...
  // ... (memoized values: totalUsers, heroCoin, etc.) ...
  // ... (renderActivePage) ...

  // --- Render Utama dengan Loading Auth ---
  if (isAuthLoading) {
     return (
        <div className="min-h-screen bg-transparent text-white flex items-center justify-center">
            Memverifikasi sesi login...
        </div>
     );
  }

  // --- Auth Flow Rendering ---
  // Jika tidak ada user aplikasi DAN tidak ada user Google yang pending
  if (!currentUser && !pendingGoogleUser) {
    return (
      <LoginPage
        onGoogleRegisterSuccess={handleGoogleRegisterSuccess}
        onLogin={handleLogin}
      />
    );
  }
  // Jika ada user Google yang pending (menunggu pembuatan profil)
  if (pendingGoogleUser && (!currentUser || currentUser.email !== pendingGoogleUser.email)) {
     // Pastikan juga currentUser belum di-set untuk user ini
     return <CreateIdPage onProfileComplete={handleProfileComplete} googleProfile={pendingGoogleUser} />;
  }
  // Jika ada user aplikasi tapi belum punya username (kasus edge, jika handleProfileComplete belum selesai)
   if (currentUser && !currentUser.username && pendingGoogleUser) {
      return <CreateIdPage onProfileComplete={handleProfileComplete} googleProfile={pendingGoogleUser} />;
   }
   // Jika ada user aplikasi tapi belum punya username DAN tidak ada user google pending (harusnya tidak terjadi)
   if (currentUser && !currentUser.username && !pendingGoogleUser) {
       console.error("State aneh: currentUser ada tapi tanpa username, dan tidak ada pendingGoogleUser.");
       // Mungkin fallback ke logout atau halaman error
       handleLogout();
       return <LoginPage onGoogleRegisterSuccess={handleGoogleRegisterSuccess} onLogin={handleLogin} />; // Kembali ke login
   }


  // --- Render Aplikasi Utama (setelah semua auth check selesai dan currentUser valid) ---
  // Pastikan currentUser ada sebelum render utama
  if (!currentUser || !currentUser.username) {
     console.error("Render utama dicegah: currentUser tidak valid.", currentUser);
     // Mungkin fallback ke halaman login jika state tidak konsisten
     return <LoginPage onGoogleRegisterSuccess={handleGoogleRegisterSuccess} onLogin={handleLogin} />;
  }

   return (
       <div className="min-h-screen bg-transparent text-white font-sans flex flex-col">
           <Particles />
           <Header userProfile={currentUser} onLogout={handleLogout} activePage={activePage} onNavigate={handleNavigate} currency={currency} onCurrencyChange={setCurrency} hotCoin={hotCoin} idrRate={idrRate} />
           <main className="flex-grow">
               {renderActivePage()}
           </main>
           <Footer />
           {authError && ( // Tampilkan error auth jika ada
              <div className="fixed bottom-4 right-4 bg-red-600 text-white p-3 rounded-lg shadow-lg z-50">
                  <p>Error Auth: {authError}</p>
                  <button onClick={() => setAuthError(null)} className="ml-2 text-sm underline">Tutup</button>
              </div>
           )}
       </div>
   );
};

// Wrap AppContent dengan GoogleOAuthProvider (Tetap sama)
const App = () => {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) { /* ... (render error jika client ID tidak ada) ... */ }
    return (
        <GoogleOAuthProvider clientId={googleClientId}>
            <AppContent />
        </GoogleOAuthProvider>
    );
};

export default App;