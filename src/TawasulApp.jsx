import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged,
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  onSnapshot, 
  updateDoc, 
  increment,
  serverTimestamp,
  getDoc,
  deleteDoc,
  query
} from 'firebase/firestore';
import { 
  Moon, 
  Sun, 
  Search, 
  MessageCircle, 
  Repeat2, 
  Heart, 
  Share, 
  PlusCircle, 
  Home, 
  User, 
  Bell, 
  Languages,
  LogOut,
  BarChart3,
  Settings,
  ChevronLeft,
  Image as ImageIcon,
  Plus,
  Camera,
  Upload,
  X,
  Send,
  Users,
  AlertCircle,
  Loader2
} from 'lucide-react';

/**
 * 🛠️ تنبيه هام لحل خطأ (auth/configuration-not-found):
 * 1. اذهب إلى Firebase Console (https://console.firebase.google.com).
 * 2. اختر مشروعك "tawasulapp-ed2cc".
 * 3. من القائمة الجانبية اختر Build > Authentication.
 * 4. اذهب إلى تبويب Sign-in method.
 * 5. اضغط على Add new provider واختر "Anonymous".
 * 6. قم بتفعيل الخيار (Enable) ثم اضغط Save.
 */

// --- إعدادات Firebase الخاصة بك ---
const firebaseConfig = {
  apiKey: "AIzaSyDTS_242baQcL7MNXN-XONz1L9g6Jbb9zc",
  authDomain: "tawasulapp-ed2cc.firebaseapp.com",
  projectId: "tawasulapp-ed2cc",
  storageBucket: "tawasulapp-ed2cc.firebasestorage.app",
  messagingSenderId: "408853666318",
  appId: "1:408853666318:web:73d9d4e9a2775f97027a5f",
  measurementId: "G-RK41YT4KCG"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// تهيئة Analytics بشكل آمن
let analytics = null;
if (typeof window !== "undefined") {
  try {
    analytics = getAnalytics(app);
  } catch (e) {
    console.warn("Analytics error:", e.message);
  }
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'tawasul-prod-v1';

// --- قاموس الترجمة ---
const translations = {
  ar: {
    home: "الرئيسية",
    notifications: "الإشعارات",
    profile: "الملف الشخصي",
    dashboard: "لوحة التحكم",
    friends: "الأصدقاء",
    search: "بحث في تواصل...",
    newTweet: "تغريدة جديدة",
    post: "نشر",
    logout: "خروج",
    views: "مشاهدة",
    replies: "الردود",
    editProfile: "تعديل الملف",
    save: "حفظ التغييرات",
    name: "الاسم",
    bio: "السيرة الذاتية",
    avatarUrl: "تغيير الصورة الشخصية",
    headerUrl: "تغيير صورة الغلاف",
    back: "رجوع",
    trending: "متداول الآن",
    whoToFollow: "اقتراحات المتابعة",
    uploadImage: "رفع صورة",
    following: "أتابع",
    followers: "متابعون",
    writeComment: "اكتب تعليقك...",
    noTweets: "لا توجد تغريدات بعد.",
    noFriends: "لا يوجد مستخدمون مقترحون.",
    whatHappening: "ماذا يدور في ذهنك؟",
    authErrorTitle: "مطلوب إعداد إضافي في Firebase",
    authErrorMessage: "يجب تفعيل 'Anonymous Sign-in' في لوحة تحكم Firebase ليعمل التطبيق.",
    loading: "جاري التحميل..."
  },
  en: {
    home: "Home",
    notifications: "Notifications",
    profile: "Profile",
    dashboard: "Dashboard",
    friends: "Friends",
    search: "Search Tawasul...",
    newTweet: "New Tweet",
    post: "Post",
    logout: "Logout",
    views: "Views",
    replies: "Replies",
    editProfile: "Edit Profile",
    save: "Save Changes",
    name: "Name",
    bio: "Bio",
    avatarUrl: "Change Avatar",
    headerUrl: "Change Header",
    back: "Back",
    trending: "Trending Now",
    whoToFollow: "Suggested for you",
    uploadImage: "Upload Image",
    following: "Following",
    followers: "Followers",
    writeComment: "Write a comment...",
    noTweets: "No tweets yet.",
    noFriends: "No suggested users.",
    whatHappening: "What's happening?",
    authErrorTitle: "Firebase Setup Required",
    authErrorMessage: "You must enable 'Anonymous Sign-in' in your Firebase Console to start.",
    loading: "Loading..."
  }
};

export default function App() {
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [profileData, setProfileData] = useState({ 
    name: "مستخدم تواصل", 
    bio: "أهلاً بك في تواصل", 
    avatar: "https://i.pravatar.cc/150?u=tawasul", 
    header: "https://images.unsplash.com/photo-1557683316-973673baf926?w=1200" 
  });
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [language, setLanguage] = useState('ar');
  const [tweets, setTweets] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [followingIds, setFollowingIds] = useState([]);
  const [view, setView] = useState('feed'); 
  const [selectedTweet, setSelectedTweet] = useState(null);
  const [newTweetText, setNewTweetText] = useState("");
  const [newTweetImage, setNewTweetImage] = useState("");
  const [commentText, setCommentText] = useState("");
  const [showTweetModal, setShowTweetModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const tweetFileRef = useRef(null);
  const avatarFileRef = useRef(null);
  const headerFileRef = useRef(null);

  const t = translations[language];
  const isRtl = language === 'ar';

  const compressImage = (base64, maxWidth = 800, quality = 0.6) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    });
  };

  // 1. إدارة المصادقة (Auth) مع حل مشكلة Custom Token Mismatch
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try {
            await signInWithCustomToken(auth, __initial_auth_token);
          } catch (tokenErr) {
            console.warn("Custom token invalid or mismatched, falling back to anonymous login...");
            await signInAnonymously(auth);
          }
        } else {
          await signInAnonymously(auth);
        }
        setAuthError(null);
      } catch (err) { 
        console.error("Firebase Auth Initialization Failed:", err.code);
        setAuthError(err.code);
      } finally {
        setIsInitializing(false);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // استخدام مسار Firestore الصحيح حسب القاعدة رقم 1
        const userRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'profile', 'data');
        try {
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setProfileData(userSnap.data());
          } else {
            const initial = { 
              name: language === 'ar' ? "مستخدم جديد" : "New User",
              bio: "أهلاً بك في منصة تواصل الاجتماعية", 
              avatar: `https://i.pravatar.cc/150?u=${currentUser.uid}`, 
              header: "https://images.unsplash.com/photo-1557683316-973673baf926?w=1200" 
            };
            await setDoc(userRef, initial);
            setProfileData(initial);
          }
        } catch (e) {
          console.error("Profile fetch error:", e);
        }
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, [language]);

  // 2. مستمعات البيانات في الوقت الفعلي
  useEffect(() => {
    if (!user) return;

    // جلب التغريدات العامة
    const tweetsCol = collection(db, 'artifacts', appId, 'public', 'data', 'tweets');
    const unsubTweets = onSnapshot(tweetsCol, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTweets(list.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
    }, (err) => console.error("Tweets listener error:", err));

    // جلب قائمة المستخدمين للاقتراحات
    const usersCol = collection(db, 'artifacts', appId, 'public', 'data', 'all_users');
    const unsubUsers = onSnapshot(usersCol, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsersList(list.filter(u => u.id !== user.uid));
    }, (err) => console.error("Users list listener error:", err));

    // جلب قائمة المتابعين
    const followingCol = collection(db, 'artifacts', appId, 'users', user.uid, 'following');
    const unsubFollow = onSnapshot(followingCol, (snap) => {
      setFollowingIds(snap.docs.map(d => d.id));
    }, (err) => console.error("Following list error:", err));

    return () => { unsubTweets(); unsubUsers(); unsubFollow(); };
  }, [user]);

  // تحديث البيانات العامة
  useEffect(() => {
    if (!user) return;
    const updatePublic = async () => {
      try {
        const ref = doc(db, 'artifacts', appId, 'public', 'data', 'all_users', user.uid);
        await setDoc(ref, { id: user.uid, ...profileData }, { merge: true });
      } catch (e) { console.error("Public info update error:", e); }
    };
    updatePublic();
  }, [profileData, user]);

  const onFileChange = (file, callback, maxWidth = 800) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const compressed = await compressImage(reader.result, maxWidth);
      callback(compressed);
    };
    reader.readAsDataURL(file);
  };

  const postTweet = async () => {
    if (!newTweetText.trim() || loading || !user) return;
    setLoading(true);
    try {
      const col = collection(db, 'artifacts', appId, 'public', 'data', 'tweets');
      await addDoc(col, {
        userId: user.uid,
        userName: profileData.name,
        avatar: profileData.avatar,
        text: newTweetText,
        tweetImage: newTweetImage,
        likes: 0,
        retweets: 0,
        views: 0,
        replies: [],
        timestamp: serverTimestamp()
      });
      setNewTweetText("");
      setNewTweetImage("");
      setShowTweetModal(false);
    } catch (e) { console.error("Post error:", e); }
    setLoading(false);
  };

  const handleUpdateProfile = async () => {
    if (!user || loading) return;
    setLoading(true);
    try {
      const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data');
      await updateDoc(ref, profileData);
      setView('profile');
    } catch (e) { console.error("Update error:", e); }
    setLoading(false);
  };

  const addComment = async () => {
    if (!commentText.trim() || !selectedTweet || !user) return;
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'tweets', selectedTweet.id);
    const newReply = {
      userId: user.uid,
      userName: profileData.name,
      avatar: profileData.avatar,
      text: commentText,
      timestamp: new Date().toISOString()
    };
    await updateDoc(ref, { replies: [...(selectedTweet.replies || []), newReply] });
    setCommentText("");
  };

  const toggleFollow = async (target) => {
    if (!user) return;
    const followRef = doc(db, 'artifacts', appId, 'users', user.uid, 'following', target.id);
    if (followingIds.includes(target.id)) {
      await deleteDoc(followRef);
    } else {
      await setDoc(followRef, { timestamp: serverTimestamp() });
    }
  };

  const openTweetDetail = async (tweet) => {
    setSelectedTweet(tweet);
    setView('tweetDetail');
    if (user) {
      const ref = doc(db, 'artifacts', appId, 'public', 'data', 'tweets', tweet.id);
      await updateDoc(ref, { views: increment(1) });
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#09142A] flex flex-col items-center justify-center text-white p-6 text-center">
        <Loader2 className="w-12 h-12 text-[#38B6FF] animate-spin mb-4" />
        <p className="text-xl font-bold">{t.loading}</p>
      </div>
    );
  }

  if (authError === 'auth/configuration-not-found') {
    return (
      <div className="min-h-screen bg-[#09142A] flex items-center justify-center p-6" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="text-red-500 w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-4">{t.authErrorTitle}</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">{t.authErrorMessage}</p>
          <div className="bg-gray-50 p-4 rounded-2xl text-start text-sm text-gray-700 space-y-2 border border-gray-100">
            <p className="font-bold border-b pb-1 mb-2">خطوات الحل:</p>
            <p>1. اذهب لـ Firebase Console.</p>
            <p>2. اذهب لـ Authentication {' > '} Sign-in method.</p>
            <p>3. فعّل خيار <strong>Anonymous</strong>.</p>
          </div>
        </div>
      </div>
    );
  }

  const TweetItem = ({ tweet }) => (
    <article onClick={() => openTweetDetail(tweet)} className="p-5 border-b border-gray-500/10 hover:bg-gray-500/5 cursor-pointer transition-colors group">
      <div className="flex gap-4">
        <img src={tweet.avatar} className="w-12 h-12 rounded-full object-cover shadow-sm" alt="avatar" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-black text-[16px] hover:underline">{tweet.userName}</span>
            <span className="text-gray-500 text-sm">@{tweet.userId?.substring(0, 5)}</span>
          </div>
          <p className="text-[17px] leading-relaxed mb-3 whitespace-pre-wrap">{tweet.text}</p>
          {tweet.tweetImage && (
            <div className="rounded-2xl overflow-hidden border border-gray-500/10 mb-4 max-h-[400px]">
              <img src={tweet.tweetImage} className="w-full h-full object-cover" alt="media" />
            </div>
          )}
          <div className="flex justify-between text-gray-500 max-w-md">
            <button className="flex items-center gap-2 hover:text-[#38B6FF] transition-colors"><MessageCircle size={19} /> {tweet.replies?.length || 0}</button>
            <button 
              onClick={(e) => {
                e.stopPropagation(); 
                if (user) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tweets', tweet.id), {retweets: increment(1)});
              }} 
              className="flex items-center gap-2 hover:text-green-500 transition-colors"
            >
              <Repeat2 size={19} /> {tweet.retweets || 0}
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation(); 
                if (user) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tweets', tweet.id), {likes: increment(1)});
              }} 
              className={`flex items-center gap-2 transition-colors ${tweet.likes > 0 ? 'text-red-500' : 'hover:text-red-500'}`}
            >
              <Heart size={19} className={tweet.likes > 0 ? "fill-current" : ""} /> {tweet.likes}
            </button>
            <div className="flex items-center gap-2 text-xs"><BarChart3 size={17} /> {tweet.views || 0}</div>
            <Share size={19} />
          </div>
        </div>
      </div>
    </article>
  );

  return (
    <div className={`min-h-screen transition-all duration-500 ${isDarkMode ? 'bg-[#09142A] text-white' : 'bg-[#F0F2F5] text-gray-900'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* عناصر الرفع المخفية */}
      <input type="file" hidden ref={tweetFileRef} accept="image/*" onChange={(e) => onFileChange(e.target.files[0], setNewTweetImage, 1000)} />
      <input type="file" hidden ref={avatarFileRef} accept="image/*" onChange={(e) => onFileChange(e.target.files[0], (r) => setProfileData({...profileData, avatar: r}), 300)} />
      <input type="file" hidden ref={headerFileRef} accept="image/*" onChange={(e) => onFileChange(e.target.files[0], (r) => setProfileData({...profileData, header: r}), 1200)} />

      <header className={`sticky top-0 z-50 px-6 py-3 flex items-center justify-between border-b ${isDarkMode ? 'bg-[#09142A]/90 border-gray-800' : 'bg-white/90 border-gray-200'} backdrop-blur-xl`}>
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-black text-[#38B6FF] cursor-pointer hover:scale-105 transition-transform" onClick={() => setView('feed')}>TAWASUL</h1>
          <div className={`hidden lg:flex items-center gap-3 px-4 py-2 rounded-full border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
            <Search size={18} className="text-gray-400" />
            <input type="text" placeholder={t.search} className="bg-transparent outline-none text-sm w-48" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setLanguage(l => l === 'ar' ? 'en' : 'ar')} className="p-2 text-[#38B6FF] hover:bg-gray-500/10 rounded-full transition-colors"><Languages size={20} /></button>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 text-[#38B6FF] hover:bg-gray-500/10 rounded-full transition-colors">{isDarkMode ? <Sun size={20} /> : <Moon size={20} />}</button>
          <img src={profileData.avatar} className="w-9 h-9 rounded-full border-2 border-[#38B6FF] cursor-pointer object-cover shadow-sm" onClick={() => setView('profile')} />
        </div>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12">
        <nav className="hidden md:col-span-3 md:flex flex-col justify-between h-[calc(100vh-65px)] sticky top-[65px] p-4 border-e border-gray-500/10">
          <div className="flex flex-col gap-1">
            {[
              { id: 'feed', icon: Home, label: t.home },
              { id: 'profile', icon: User, label: t.profile },
              { id: 'friends', icon: Users, label: t.friends },
              { id: 'dashboard', icon: Settings, label: t.dashboard },
            ].map(item => (
              <button key={item.id} onClick={() => setView(item.id)} className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${view === item.id ? 'bg-[#38B6FF]/10 text-[#38B6FF] font-black' : 'hover:bg-gray-500/5 text-gray-500'}`}>
                <item.icon size={26} /> <span className="text-lg font-bold">{item.label}</span>
              </button>
            ))}
          </div>
          <button onClick={() => signOut(auth)} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-red-500/10 text-red-400 mb-10 transition-all font-bold">
            <LogOut size={24} /> <span className="text-lg">{t.logout}</span>
          </button>
        </nav>

        <main className={`md:col-span-6 min-h-screen border-e border-gray-500/10 ${!isDarkMode ? 'bg-white' : ''}`}>
          {view === 'feed' && (
            <div className="animate-in fade-in duration-500">
              <div className="p-5 border-b border-gray-500/10">
                <div className="flex gap-4">
                  <img src={profileData.avatar} className="w-12 h-12 rounded-full object-cover shadow-sm" alt="me" />
                  <div className="flex-1">
                    <textarea 
                      value={newTweetText} 
                      onChange={e => setNewTweetText(e.target.value)} 
                      placeholder={t.whatHappening} 
                      className="w-full bg-transparent text-xl outline-none resize-none h-20 placeholder:text-gray-500" 
                    />
                    {newTweetImage && (
                      <div className="relative mt-2 rounded-2xl overflow-hidden mb-4 border border-gray-500/20 shadow-md">
                        <img src={newTweetImage} className="w-full max-h-72 object-cover" alt="prev" />
                        <button onClick={() => setNewTweetImage("")} className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-red-500 transition-colors"><X size={16}/></button>
                      </div>
                    )}
                    <div className="flex justify-between items-center border-t border-gray-500/10 pt-4 mt-2">
                      <button onClick={() => tweetFileRef.current?.click()} className="text-[#38B6FF] hover:bg-[#38B6FF]/10 p-2 rounded-full transition-all"><ImageIcon size={22} /></button>
                      <button onClick={postTweet} disabled={!newTweetText.trim() || loading || !user} className={`px-8 py-2 rounded-full font-bold shadow-lg transition-all ${newTweetText.trim() && user ? 'bg-[#38B6FF] text-white active:scale-95' : 'bg-gray-500/20 text-gray-400'}`}>
                        {loading ? '...' : t.post}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-gray-500/10">
                {tweets.map(tweet => <TweetItem key={tweet.id} tweet={tweet} />)}
              </div>
            </div>
          )}

          {view === 'friends' && (
            <div className="p-6 animate-in fade-in">
              <h2 className="text-2xl font-black mb-6 text-[#38B6FF] flex items-center gap-3"><Users size={28} /> {t.whoToFollow}</h2>
              <div className="space-y-4">
                {usersList.map(u => (
                  <div key={u.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-gray-800/40 border-gray-700 hover:bg-gray-800' : 'bg-gray-50 border-gray-200 hover:bg-white shadow-sm'}`}>
                    <div className="flex gap-4 items-center">
                      <img src={u.avatar} className="w-12 h-12 rounded-full object-cover shadow-sm" alt="u" />
                      <div><p className="font-black text-lg">{u.name}</p><p className="text-xs text-gray-500">@{u.id.substring(0,6)}</p></div>
                    </div>
                    <button onClick={() => toggleFollow(u)} className={`px-5 py-1.5 rounded-full font-bold text-sm transition-all active:scale-95 ${followingIds.includes(u.id) ? 'bg-gray-500/20 text-gray-500' : 'bg-[#38B6FF] text-white shadow-md'}`}>
                      {followingIds.includes(u.id) ? t.unfollow : t.follow}
                    </button>
                  </div>
                ))}
                {usersList.length === 0 && <p className="text-center py-20 text-gray-500">{t.noFriends}</p>}
              </div>
            </div>
          )}

          {view === 'profile' && (
            <div className="pb-20 animate-in fade-in">
              <div className="h-48 relative overflow-hidden bg-gradient-to-tr from-[#09142A] to-[#38B6FF]">
                <img src={profileData.header} className="w-full h-full object-cover opacity-80" alt="header" />
                <div className="absolute -bottom-16 right-6">
                  <img src={profileData.avatar} className={`w-32 h-32 rounded-full border-4 ${isDarkMode ? 'border-[#09142A]' : 'border-white'} shadow-2xl object-cover`} alt="p-pic" />
                </div>
              </div>
              <div className="mt-20 px-8">
                <div className="flex justify-between items-start">
                  <h2 className="text-3xl font-black">{profileData.name}</h2>
                  <button onClick={() => setView('dashboard')} className="border-2 border-[#38B6FF] text-[#38B6FF] px-6 py-2 rounded-full font-black hover:bg-[#38B6FF]/10 transition-all shadow-md active:scale-95">{t.editProfile}</button>
                </div>
                <p className="mt-6 text-xl leading-relaxed max-w-2xl">{profileData.bio}</p>
                <div className="flex gap-8 mt-6 text-gray-500 font-bold">
                  <span><strong className={isDarkMode ? 'text-white' : 'text-black'}>{followingIds.length}</strong> {t.following}</span>
                  <span><strong className={isDarkMode ? 'text-white' : 'text-black'}>1.2K</strong> {t.followers}</span>
                </div>
              </div>
              <div className="mt-10 divide-y divide-gray-500/10 border-t border-gray-500/10">
                {tweets.filter(tw => tw.userId === user?.uid).map(tweet => <TweetItem key={tweet.id} tweet={tweet} />)}
                {tweets.filter(tw => tw.userId === user?.uid).length === 0 && <p className="text-center py-20 text-gray-500">{t.noTweets}</p>}
              </div>
            </div>
          )}

          {view === 'dashboard' && (
            <div className="p-8 space-y-8 max-w-xl animate-in slide-in-from-top-4">
              <h2 className="text-2xl font-black text-[#38B6FF] flex items-center gap-3"><Settings size={28} /> {t.dashboard}</h2>
              <div className="space-y-6">
                <div 
                  className="relative h-40 rounded-2xl border-2 border-dashed border-gray-500/30 overflow-hidden cursor-pointer group" 
                  onClick={() => headerFileRef.current?.click()}
                >
                  <img src={profileData.header} className="w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity" alt="p" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 group-hover:text-[#38B6FF]"><Upload size={32} /> <span className="text-xs font-bold mt-2">{t.uploadImage}</span></div>
                </div>
                <div className="flex items-center gap-6">
                   <div className="relative group cursor-pointer" onClick={() => avatarFileRef.current?.click()}>
                      <img src={profileData.avatar} className="w-24 h-24 rounded-full border-4 border-[#38B6FF] object-cover shadow-lg group-hover:brightness-75 transition-all" alt="a" />
                      <div className="absolute inset-0 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"><Camera size={24} /></div>
                   </div>
                   <div className="flex-1">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t.name}</label>
                      <input type="text" value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} className={`w-full p-3 rounded-xl border outline-none focus:border-[#38B6FF] transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`} />
                   </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t.bio}</label>
                  <textarea value={profileData.bio} onChange={e => setProfileData({...profileData, bio: e.target.value})} className={`w-full p-3 rounded-xl border h-24 outline-none focus:border-[#38B6FF] transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`} />
                </div>
                <button onClick={handleUpdateProfile} disabled={loading || !user} className="w-full bg-[#38B6FF] text-white py-4 rounded-2xl font-black shadow-xl hover:shadow-[#38B6FF]/30 active:scale-95 transition-all">{loading ? '...' : t.save}</button>
              </div>
            </div>
          )}

          {view === 'tweetDetail' && selectedTweet && (
             <div className="p-6 animate-in slide-in-from-start-6">
                <button onClick={() => setView('feed')} className="mb-6 p-2 hover:bg-gray-500/10 rounded-full transition-colors"><ChevronLeft /></button>
                <div className="flex gap-4 items-center mb-6">
                   <img src={selectedTweet.avatar} className="w-14 h-14 rounded-full border-2 border-[#38B6FF] object-cover shadow-md" alt="a" />
                   <div><p className="font-black text-lg">{selectedTweet.userName}</p><p className="text-gray-500 text-sm">@{selectedTweet.userId?.substring(0,6)}</p></div>
                </div>
                <p className="text-2xl leading-snug mb-6 font-medium whitespace-pre-wrap">{selectedTweet.text}</p>
                {selectedTweet.tweetImage && <img src={selectedTweet.tweetImage} className="w-full rounded-3xl mb-6 shadow-sm border border-gray-500/10" alt="m" />}
                <div className="py-4 border-y border-gray-500/10 flex gap-8 text-gray-500 text-xs font-bold uppercase tracking-widest">
                  <span><strong className={isDarkMode ? 'text-white' : 'text-black'}>{selectedTweet.views || 0}</strong> {t.views}</span>
                  <span><strong className={isDarkMode ? 'text-white' : 'text-black'}>{selectedTweet.likes || 0}</strong> {language === 'ar' ? 'إعجاب' : 'Likes'}</span>
                  <span><strong className={isDarkMode ? 'text-white' : 'text-black'}>{selectedTweet.replies?.length || 0}</strong> {t.replies}</span>
                </div>
                <div className="mt-8 flex gap-4">
                  <img src={profileData.avatar} className="w-10 h-10 rounded-full object-cover" alt="me" />
                  <div className="flex-1 relative">
                    <input type="text" value={commentText} onChange={e => setCommentText(e.target.value)} placeholder={t.writeComment} className={`w-full p-4 pr-12 rounded-2xl border outline-none focus:border-[#38B6FF] transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`} onKeyPress={e => e.key === 'Enter' && addComment()} />
                    <button onClick={addComment} disabled={!user} className="absolute left-3 top-3 text-[#38B6FF] p-1 hover:bg-[#38B6FF]/10 rounded-full transition-colors"><Send size={20} className={isRtl ? 'rotate-180' : ''} /></button>
                  </div>
                </div>
                <div className="mt-8 space-y-6 pb-10">
                  {(selectedTweet.replies || []).map((reply, i) => (
                    <div key={i} className="flex gap-4 animate-in fade-in">
                      <img src={reply.avatar} className="w-10 h-10 rounded-full object-cover shadow-sm" alt="r" />
                      <div className={`flex-1 p-4 rounded-2xl ${isDarkMode ? 'bg-gray-800/40' : 'bg-gray-100 shadow-sm'}`}><div className="flex justify-between items-center mb-1"><span className="font-bold text-sm">{reply.userName}</span><span className="text-[10px] text-gray-500">{new Date(reply.timestamp).toLocaleTimeString(language)}</span></div><p className="text-[16px] leading-relaxed">{reply.text}</p></div>
                    </div>
                  )).reverse()}
                </div>
             </div>
          )}
        </main>

        <aside className="hidden md:col-span-3 p-4 flex flex-col gap-6 sticky top-[65px] h-[calc(100vh-65px)] border-l border-gray-500/10">
           <div className={`p-5 rounded-3xl ${isDarkMode ? 'bg-gray-800/30' : 'bg-gray-100 shadow-sm'}`}><h3 className="font-black text-xl mb-5">{t.trending}</h3>{['#تواصل_2026', '#React_JS', '#Web_Dev_Ar'].map(tag => (<div key={tag} className="py-3 hover:bg-gray-500/5 cursor-pointer px-2 rounded-xl transition-colors group"><p className="text-[#38B6FF] font-black group-hover:underline">{tag}</p><p className="text-xs text-gray-500">2,451 Tweets</p></div>))}</div>
        </aside>
      </div>

      <nav className={`md:hidden fixed bottom-0 left-0 right-0 p-4 border-t flex justify-around backdrop-blur-md z-40 ${isDarkMode ? 'bg-[#09142A]/90 border-gray-800 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]' : 'bg-white/90 border-gray-200 shadow-xl'}`}>
        <Home onClick={() => setView('feed')} className={view === 'feed' ? 'text-[#38B6FF]' : 'text-gray-400'} size={26} />
        <Users onClick={() => setView('friends')} className={view === 'friends' ? 'text-[#38B6FF]' : 'text-gray-400'} size={26} />
        <PlusCircle onClick={() => setShowTweetModal(true)} className="text-[#38B6FF]" size={32} />
        <User onClick={() => setView('profile')} className={view === 'profile' ? 'text-[#38B6FF]' : 'text-gray-400'} size={26} />
        <Settings onClick={() => setView('dashboard')} className={view === 'dashboard' ? 'text-[#38B6FF]' : 'text-gray-400'} size={26} />
      </nav>

      {showTweetModal && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-start justify-center pt-20 backdrop-blur-md p-4 animate-in fade-in">
           <div className={`w-full max-w-xl rounded-3xl shadow-2xl p-6 ${isDarkMode ? 'bg-[#09142A] border border-gray-800' : 'bg-white'}`}><div className="flex justify-between items-center mb-6"><button onClick={() => setShowTweetModal(false)} className="text-gray-500 p-2 hover:bg-red-500/10 rounded-full transition-colors"><X size={28} /></button><button onClick={postTweet} disabled={!newTweetText.trim() || loading || !user} className="bg-[#38B6FF] text-white px-8 py-2 rounded-full font-black shadow-lg transition-transform active:scale-95">{loading ? '...' : t.post}</button></div><div className="flex gap-4"><img src={profileData.avatar} className="w-12 h-12 rounded-full object-cover shadow-sm" alt="av" /><div className="flex-1"><textarea autoFocus value={newTweetText} onChange={e => setNewTweetText(e.target.value)} className="w-full bg-transparent text-xl outline-none resize-none min-h-[150px] placeholder:text-gray-500" placeholder={t.whatHappening} />{newTweetImage && (<div className="relative mt-2 rounded-2xl overflow-hidden mb-4 shadow-xl border border-gray-500/10"><img src={newTweetImage} className="w-full max-h-60 object-cover" alt="p" /><button onClick={() => setNewTweetImage("")} className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-red-500 transition-colors"><X size={16}/></button></div>)}<button onClick={() => tweetFileRef.current?.click()} className="mt-4 text-[#38B6FF] hover:bg-[#38B6FF]/10 p-2 rounded-full transition-all"><ImageIcon size={24} /></button></div></div></div>
        </div>
      )}
    </div>
  );
}
