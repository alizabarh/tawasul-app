import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
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
  deleteDoc
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
  Users
} from 'lucide-react';

// --- إعدادات Firebase ---
// يتم جلب هذه الإعدادات من بيئة التشغيل (Vercel Env Variables في حال النشر)
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : { /* إعدادات افتراضية للتطوير المحلي */ };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'tawasul-production-v1';

// --- النصوص المترجمة ---
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
    logout: "خروج / تخطي",
    views: "مشاهدة",
    replies: "الردود",
    editProfile: "تعديل الملف",
    save: "حفظ التغييرات",
    name: "الاسم",
    bio: "السيرة الذاتية",
    avatarUrl: "تغيير صورة البروفايل",
    headerUrl: "تغيير صورة الغلاف",
    back: "رجوع",
    trending: "متداول الآن",
    whoToFollow: "اقتراحات المتابعة",
    uploadImage: "رفع صورة من الجهاز",
    removeImage: "إزالة",
    following: "أتابع",
    followers: "متابعون",
    follow: "متابعة",
    unfollow: "إلغاء المتابعة",
    writeComment: "اكتب تعليقك...",
    noTweets: "لا توجد تغريدات بعد.",
    noFriends: "لا يوجد مستخدمون مقترحون حالياً."
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
    logout: "Logout / Skip",
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
    uploadImage: "Upload from device",
    removeImage: "Remove",
    following: "Following",
    followers: "Followers",
    follow: "Follow",
    unfollow: "Unfollow",
    writeComment: "Write a comment...",
    noTweets: "No tweets yet.",
    noFriends: "No suggested users at the moment."
  }
};

export default function App() {
  const [user, setUser] = useState(null);
  const [profileData, setProfileData] = useState({ 
    name: "User", 
    bio: "أهلاً بك في تواصل", 
    avatar: "https://i.pravatar.cc/150?u=1", 
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

  // دالة لضغط الصور برمجياً لتقليل حجمها قبل الرفع (حل مشكلة حجم الوثيقة في Firebase)
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

  // 1. إدارة المصادقة وجلب البروفايل
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth initialization failed", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userRef = doc(db, 'artifacts', appId, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          setProfileData(userSnap.data());
        } else {
          const initialData = {
            name: language === 'ar' ? "مستخدم تواصل" : "Tawasul User",
            bio: "شغوف بالتقنية والتواصل",
            avatar: `https://i.pravatar.cc/150?u=${currentUser.uid}`,
            header: "https://images.unsplash.com/photo-1557683316-973673baf926?w=1200"
          };
          await setDoc(userRef, initialData);
          setProfileData(initialData);
        }
      }
    });
    return () => unsubscribe();
  }, [language]);

  // 2. جلب التغريدات والمستخدمين
  useEffect(() => {
    if (!user) return;
    
    const tweetsRef = collection(db, 'artifacts', appId, 'public', 'data', 'tweets');
    const unsubscribeTweets = onSnapshot(tweetsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTweets(data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
    });

    const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'all_users');
    const unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsersList(data.filter(u => u.id !== user.uid));
    });

    const followingRef = collection(db, 'artifacts', appId, 'users', user.uid, 'following');
    const unsubscribeFollowing = onSnapshot(followingRef, (snapshot) => {
      setFollowingIds(snapshot.docs.map(doc => doc.id));
    });

    // تحديث بيانات المستخدم العامة
    const publicUserRef = doc(db, 'artifacts', appId, 'public', 'data', 'all_users', user.uid);
    setDoc(publicUserRef, {
      id: user.uid,
      name: profileData.name,
      avatar: profileData.avatar,
      bio: profileData.bio
    }, { merge: true });

    return () => {
      unsubscribeTweets();
      unsubscribeUsers();
      unsubscribeFollowing();
    };
  }, [user, profileData.name, profileData.avatar, profileData.bio]);

  // 3. معالجة الصور وضغطها
  const processFile = (file, callback, maxWidth = 800) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const compressed = await compressImage(reader.result, maxWidth);
      callback(compressed);
    };
    reader.readAsDataURL(file);
  };

  const triggerTweetFile = () => tweetFileRef.current?.click();
  const triggerAvatarFile = () => avatarFileRef.current?.click();
  const triggerHeaderFile = () => headerFileRef.current?.click();

  // 4. العمليات الأساسية (نشر، تحديث، متابعة)
  const handlePostTweet = async () => {
    if (!newTweetText.trim() || loading) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tweets'), {
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
    } catch (e) { console.error("Error posting tweet:", e); }
    setLoading(false);
  };

  const handleUpdateProfile = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'artifacts', appId, 'users', user.uid);
      await updateDoc(userRef, profileData);
      
      const publicUserRef = doc(db, 'artifacts', appId, 'public', 'data', 'all_users', user.uid);
      await updateDoc(publicUserRef, {
        name: profileData.name,
        avatar: profileData.avatar,
        bio: profileData.bio
      });
      
      setView('profile');
    } catch (e) { console.error("Error updating profile:", e); }
    setLoading(false);
  };

  const toggleFollow = async (targetUser) => {
    if (!user) return;
    const followingDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'following', targetUser.id);
    const followerDocRef = doc(db, 'artifacts', appId, 'users', targetUser.id, 'followers', user.uid);

    if (followingIds.includes(targetUser.id)) {
      await deleteDoc(followingDocRef);
      await deleteDoc(followerDocRef);
    } else {
      await setDoc(followingDocRef, { timestamp: serverTimestamp() });
      await setDoc(followerDocRef, { timestamp: serverTimestamp() });
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !selectedTweet) return;
    const tweetRef = doc(db, 'artifacts', appId, 'public', 'data', 'tweets', selectedTweet.id);
    const newReply = {
      userId: user.uid,
      userName: profileData.name,
      avatar: profileData.avatar,
      text: commentText,
      timestamp: new Date().toISOString()
    };
    await updateDoc(tweetRef, {
      replies: [...(selectedTweet.replies || []), newReply]
    });
    setCommentText("");
  };

  const handleInteraction = async (e, tweetId, field) => {
    e.stopPropagation();
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'tweets', tweetId);
    await updateDoc(ref, { [field]: increment(1) });
  };

  const openTweet = async (tweet) => {
    setSelectedTweet(tweet);
    setView('tweetDetail');
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'tweets', tweet.id);
    await updateDoc(ref, { views: increment(1) });
  };

  const userTweets = tweets.filter(t => t.userId === user?.uid);

  // مكون التغريدة
  const TweetCard = ({ tweet }) => (
    <article onClick={() => openTweet(tweet)} className="p-5 border-b border-gray-500/10 hover:bg-gray-500/5 cursor-pointer transition-colors group">
      <div className="flex gap-4">
        <img src={tweet.avatar} className="w-12 h-12 rounded-full object-cover shadow-sm" alt="avatar" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-black text-[16px] hover:underline">{tweet.userName}</span>
            <span className="text-gray-500 text-sm">@{tweet.userId?.substring(0, 5)}</span>
            <span className="text-gray-500 text-sm">· {tweet.timestamp?.toDate().toLocaleDateString(language)}</span>
          </div>
          <p className="text-[17px] leading-relaxed mb-3">{tweet.text}</p>
          {tweet.tweetImage && (
            <div className="rounded-2xl overflow-hidden border border-gray-500/10 mb-4 max-h-[400px] shadow-sm">
              <img src={tweet.tweetImage} className="w-full h-full object-cover" alt="content" />
            </div>
          )}
          <div className="flex justify-between text-gray-500 max-w-md">
            <button className="flex items-center gap-2 hover:text-[#38B6FF]"><MessageCircle size={19} /> {tweet.replies?.length || 0}</button>
            <button onClick={(e) => handleInteraction(e, tweet.id, 'retweets')} className="flex items-center gap-2 hover:text-green-500"><Repeat2 size={19} /> {tweet.retweets || 0}</button>
            <button onClick={(e) => handleInteraction(e, tweet.id, 'likes')} className={`flex items-center gap-2 ${tweet.likes > 0 ? 'text-red-500' : ''}`}><Heart size={19} className={tweet.likes > 0 ? "fill-current" : ""} /> {tweet.likes}</button>
            <BarChart3 size={19} />
            <Share size={19} />
          </div>
        </div>
      </div>
    </article>
  );

  return (
    <div className={`min-h-screen transition-all duration-500 ${isDarkMode ? 'bg-[#09142A] text-white' : 'bg-[#F0F2F5] text-gray-900'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* عناصر الإدخال المخفية */}
      <input type="file" hidden ref={tweetFileRef} accept="image/*" onChange={(e) => processFile(e.target.files[0], setNewTweetImage, 1000)} />
      <input type="file" hidden ref={avatarFileRef} accept="image/*" onChange={(e) => processFile(e.target.files[0], (res) => setProfileData({...profileData, avatar: res}), 300)} />
      <input type="file" hidden ref={headerFileRef} accept="image/*" onChange={(e) => processFile(e.target.files[0], (res) => setProfileData({...profileData, header: res}), 1200)} />

      {/* الشريط العلوي */}
      <header className={`sticky top-0 z-50 px-6 py-3 flex items-center justify-between border-b ${isDarkMode ? 'bg-[#09142A]/90 border-gray-800' : 'bg-white/90 border-gray-200'} backdrop-blur-xl`}>
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-black text-[#38B6FF] cursor-pointer" onClick={() => setView('feed')}>TAWASUL</h1>
          <div className={`hidden lg:flex items-center gap-3 px-4 py-2 rounded-full border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
            <Search size={18} className="text-gray-400" />
            <input type="text" placeholder={t.search} className="bg-transparent outline-none text-sm w-48" />
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={() => setShowTweetModal(true)} className="hidden sm:flex items-center gap-2 bg-[#38B6FF] text-white px-5 py-2 rounded-full font-bold shadow-lg transition-transform active:scale-95">
            <Plus size={18} /> {t.newTweet}
          </button>
          <button onClick={() => setLanguage(l => l === 'ar' ? 'en' : 'ar')} className="p-2 text-[#38B6FF] hover:bg-gray-500/10 rounded-full transition-colors"><Languages size={20} /></button>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 text-[#38B6FF] hover:bg-gray-500/10 rounded-full transition-colors">{isDarkMode ? <Sun size={20} /> : <Moon size={20} />}</button>
          <img src={profileData.avatar} className="w-9 h-9 rounded-full border-2 border-[#38B6FF] cursor-pointer object-cover shadow-sm" onClick={() => setView('profile')} />
        </div>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-0">
        
        {/* القائمة الجانبية */}
        <nav className="hidden md:col-span-3 md:flex flex-col justify-between h-[calc(100vh-65px)] sticky top-[65px] p-4 border-e border-gray-500/10">
          <div className="flex flex-col gap-1">
            {[
              { id: 'feed', icon: Home, label: t.home },
              { id: 'profile', icon: User, label: t.profile },
              { id: 'friends', icon: Users, label: t.friends },
              { id: 'notifications', icon: Bell, label: t.notifications },
              { id: 'dashboard', icon: Settings, label: t.dashboard },
            ].map(item => (
              <button key={item.id} onClick={() => setView(item.id)} className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${view === item.id ? 'bg-[#38B6FF]/10 text-[#38B6FF] font-black' : 'hover:bg-gray-500/5 text-gray-500'}`}>
                <item.icon size={26} /> <span className="text-lg">{item.label}</span>
              </button>
            ))}
          </div>
          <button onClick={() => signOut(auth)} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-red-500/10 text-red-400 mb-4 transition-colors">
            <LogOut size={24} /> <span className="text-lg font-bold">{t.logout}</span>
          </button>
        </nav>

        {/* محتوى الصفحة الرئيسي */}
        <main className={`md:col-span-6 min-h-screen border-e border-gray-500/10 ${!isDarkMode ? 'bg-white' : ''}`}>
          
          {view === 'feed' && (
            <div className="animate-in fade-in duration-500">
              <div className="p-5 border-b border-gray-500/10">
                <div className="flex gap-4">
                  <img src={profileData.avatar} className="w-12 h-12 rounded-full object-cover shadow-sm" alt="me" />
                  <div className="flex-1">
                    <textarea value={newTweetText} onChange={(e) => setNewTweetText(e.target.value)} placeholder={t.whatHappening} className="w-full bg-transparent text-xl outline-none resize-none h-20" />
                    {newTweetImage && (
                      <div className="relative mt-2 rounded-2xl overflow-hidden mb-4 border border-gray-500/20 shadow-md">
                        <img src={newTweetImage} className="w-full max-h-72 object-cover" alt="prev" />
                        <button onClick={() => setNewTweetImage("")} className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-red-500 transition-colors"><X size={16}/></button>
                      </div>
                    )}
                    <div className="flex justify-between items-center border-t border-gray-500/10 pt-4 mt-2">
                      <div className="flex gap-4 text-[#38B6FF]">
                        <button onClick={triggerTweetFile} className="hover:opacity-70 transition-opacity"><ImageIcon size={22} /></button>
                        <span className="text-xs font-bold border border-[#38B6FF] px-1 rounded flex items-center cursor-pointer">GIF</span>
                      </div>
                      <button onClick={handlePostTweet} disabled={!newTweetText.trim() || loading} className={`px-8 py-2 rounded-full font-bold shadow-lg transition-all ${newTweetText.trim() ? 'bg-[#38B6FF] text-white active:scale-95' : 'bg-gray-500/20 text-gray-400'}`}>
                        {loading ? '...' : t.post}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-gray-500/10">
                {tweets.map(tweet => <TweetCard key={tweet.id} tweet={tweet} />)}
              </div>
            </div>
          )}

          {view === 'friends' && (
            <div className="animate-in fade-in duration-500 p-6">
              <h2 className="text-2xl font-black mb-6 flex items-center gap-3 text-[#38B6FF]"><Users size={28} /> {t.whoToFollow}</h2>
              <div className="space-y-4">
                {usersList.length > 0 ? (
                  usersList.map((suggestedUser) => (
                    <div key={suggestedUser.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-gray-800/40 border-gray-700 hover:bg-gray-800' : 'bg-gray-50 border-gray-200 hover:bg-white shadow-sm'}`}>
                      <div className="flex gap-4 items-center">
                        <img src={suggestedUser.avatar} className="w-12 h-12 rounded-full object-cover shadow-sm" alt="av" />
                        <div>
                          <p className="font-black text-lg">{suggestedUser.name}</p>
                          <p className="text-gray-500 text-sm">@{suggestedUser.id.substring(0,6)}</p>
                          <p className="text-xs mt-1 text-gray-400 line-clamp-1">{suggestedUser.bio}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => toggleFollow(suggestedUser)}
                        className={`px-6 py-2 rounded-full font-bold transition-all shadow-md active:scale-95 ${followingIds.includes(suggestedUser.id) ? 'bg-gray-500/20 text-gray-500' : 'bg-[#38B6FF] text-white'}`}
                      >
                        {followingIds.includes(suggestedUser.id) ? t.unfollow : t.follow}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 text-gray-500">{t.noFriends}</div>
                )}
              </div>
            </div>
          )}

          {view === 'profile' && (
            <div className="animate-in fade-in duration-700 pb-20">
              <div className="h-48 relative overflow-hidden bg-gradient-to-tr from-[#09142A] to-[#38B6FF]">
                <img src={profileData.header} className="w-full h-full object-cover opacity-80" alt="header" />
                <div className="absolute -bottom-16 right-6">
                  <img src={profileData.avatar} className={`w-32 h-32 rounded-full border-4 ${isDarkMode ? 'border-[#09142A]' : 'border-white'} shadow-2xl object-cover`} alt="p-pic" />
                </div>
              </div>
              <div className="mt-20 px-8">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h2 className="text-3xl font-black">{profileData.name}</h2>
                    <p className="text-gray-500 font-medium">@{user?.uid.substring(0, 8)}</p>
                  </div>
                  <button onClick={() => setView('dashboard')} className="border-2 border-[#38B6FF] text-[#38B6FF] px-6 py-2 rounded-full font-black hover:bg-[#38B6FF]/10 transition-all shadow-md active:scale-95">{t.editProfile}</button>
                </div>
                <p className="mt-6 text-xl leading-relaxed max-w-2xl">{profileData.bio}</p>
                <div className="flex gap-8 mt-6 text-gray-500 font-bold">
                  <span className="hover:text-[#38B6FF] cursor-pointer">
                    <strong className={isDarkMode ? 'text-white' : 'text-black'}>{followingIds.length}</strong> {t.following}
                  </span>
                  <span className="hover:text-[#38B6FF] cursor-pointer">
                    <strong className={isDarkMode ? 'text-white' : 'text-black'}>1.2K</strong> {t.followers}
                  </span>
                </div>
              </div>
              <div className="flex mt-10 border-b border-gray-500/10">
                {['tweets', 'media', 'likes'].map((tab) => (
                  <button key={tab} className={`flex-1 py-4 font-black uppercase text-xs tracking-widest transition-all ${tab === 'tweets' ? 'border-b-4 border-[#38B6FF] text-[#38B6FF]' : 'text-gray-500'}`}>
                    {language === 'ar' ? (tab === 'tweets' ? 'تغريداتي' : tab === 'media' ? 'الوسائط' : 'الإعجابات') : tab}
                  </button>
                ))}
              </div>
              <div className="divide-y divide-gray-500/10">
                {userTweets.length > 0 ? userTweets.map(tweet => <TweetCard key={tweet.id} tweet={tweet} />) : <div className="p-20 text-center text-gray-500 font-bold">{t.noTweets}</div>}
              </div>
            </div>
          )}

          {view === 'dashboard' && (
            <div className="p-8 animate-in slide-in-from-top-4 duration-500">
              <h2 className="text-2xl font-black mb-8 flex items-center gap-3 text-[#38B6FF]"><Settings /> {t.dashboard}</h2>
              <div className="space-y-8 max-w-xl">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-500 uppercase">{t.headerUrl}</label>
                  <div className="relative h-32 rounded-2xl overflow-hidden border-2 border-dashed border-gray-500/30 group cursor-pointer" onClick={triggerHeaderFile}>
                    <img src={profileData.header} className="w-full h-full object-cover opacity-50 transition-opacity group-hover:opacity-70" alt="header-preview" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 group-hover:text-[#38B6FF] transition-colors">
                      <Upload /> <span className="text-xs font-bold mt-2">{t.uploadImage}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="relative group cursor-pointer" onClick={triggerAvatarFile}>
                    <img src={profileData.avatar} className="w-24 h-24 rounded-full border-4 border-[#38B6FF] object-cover shadow-lg group-hover:opacity-80 transition-opacity" alt="avatar-preview" />
                    <div className="absolute inset-0 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 bg-black/20 rounded-full transition-opacity"><Camera /></div>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-gray-500">{t.name}</label>
                      <input 
                        type="text" 
                        value={profileData.name} 
                        onChange={(e) => setProfileData({...profileData, name: e.target.value})} 
                        className={`p-3 rounded-xl border outline-none focus:border-[#38B6FF] transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`} 
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-500">{t.bio}</label>
                  <textarea 
                    value={profileData.bio} 
                    onChange={(e) => setProfileData({...profileData, bio: e.target.value})} 
                    className={`p-3 rounded-xl border h-24 outline-none focus:border-[#38B6FF] transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`} 
                  />
                </div>
                <button 
                  onClick={handleUpdateProfile} 
                  disabled={loading}
                  className="w-full bg-[#38B6FF] text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:shadow-[#38B6FF]/20 active:scale-[0.98] transition-all"
                >
                  {loading ? '...' : t.save}
                </button>
              </div>
            </div>
          )}

          {view === 'tweetDetail' && selectedTweet && (
            <div className="p-6 animate-in slide-in-from-start-6 duration-500">
              <button onClick={() => setView('feed')} className="mb-6 p-2 hover:bg-gray-500/10 rounded-full transition-colors"><ChevronLeft /></button>
              <div className="flex gap-4 items-center mb-6">
                <img src={selectedTweet.avatar} className="w-14 h-14 rounded-full border-2 border-[#38B6FF] object-cover shadow-md" alt="detail-av" />
                <div>
                  <p className="font-black text-lg">{selectedTweet.userName}</p>
                  <p className="text-gray-500 text-sm">@{selectedTweet.userId?.substring(0,6)}</p>
                </div>
              </div>
              <p className="text-2xl leading-snug mb-6">{selectedTweet.text}</p>
              {selectedTweet.tweetImage && (
                <div className="rounded-3xl overflow-hidden border border-gray-500/10 mb-6 shadow-sm">
                  <img src={selectedTweet.tweetImage} className="w-full object-contain" alt="media" />
                </div>
              )}
              <div className="py-4 border-y border-gray-500/10 flex gap-8 text-gray-500 text-xs font-bold uppercase tracking-widest">
                <span><strong>{selectedTweet.views}</strong> {t.views}</span>
                <span><strong>{selectedTweet.likes}</strong> {t.likes}</span>
                <span><strong>{selectedTweet.replies?.length || 0}</strong> {t.replies}</span>
              </div>
              <div className="mt-8 flex gap-4">
                <img src={profileData.avatar} className="w-10 h-10 rounded-full object-cover" alt="me" />
                <div className="flex-1 relative">
                  <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder={t.writeComment} className={`w-full p-4 pr-12 rounded-2xl border outline-none ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`} />
                  <button onClick={handleAddComment} className="absolute left-3 top-3 text-[#38B6FF] hover:opacity-70 transition-opacity"><Send size={20} className={isRtl ? 'rotate-180' : ''} /></button>
                </div>
              </div>
              <div className="mt-8 space-y-6">
                {(selectedTweet.replies || []).map((reply, i) => (
                  <div key={i} className="flex gap-4 animate-in fade-in duration-500">
                    <img src={reply.avatar} className="w-10 h-10 rounded-full object-cover shadow-sm" alt="r-av" />
                    <div className={`flex-1 p-4 rounded-2xl ${isDarkMode ? 'bg-gray-800/40' : 'bg-gray-100 shadow-sm'}`}>
                      <p className="font-bold text-sm mb-1">{reply.userName}</p>
                      <p className="text-[16px]">{reply.text}</p>
                    </div>
                  </div>
                )).reverse()}
              </div>
            </div>
          )}
        </main>

        {/* القسم الأيمن */}
        <aside className="hidden md:col-span-3 p-4 flex flex-col gap-6 sticky top-[65px] h-[calc(100vh-65px)]">
          <div className={`p-5 rounded-3xl ${isDarkMode ? 'bg-gray-800/30 border border-gray-700' : 'bg-gray-100 border border-gray-200 shadow-sm'}`}>
            <h3 className="font-black text-xl mb-5">{t.trending}</h3>
            {['#تواصل_2026', '#React_Firebase', '#UI_UX', '#Web_Dev'].map(tag => (
              <div key={tag} className="py-3 hover:bg-gray-500/5 cursor-pointer rounded-xl px-2 transition-colors group">
                <p className="text-[#38B6FF] font-black group-hover:underline">{tag}</p>
                <p className="text-xs text-gray-500 font-medium">2,451 Tweets</p>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* نافذة التغريد (Modal) */}
      {showTweetModal && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-start justify-center pt-20 backdrop-blur-md p-4 animate-in fade-in duration-300">
           <div className={`w-full max-w-xl rounded-3xl shadow-2xl p-6 ${isDarkMode ? 'bg-[#09142A] border border-gray-800' : 'bg-white'}`}>
              <div className="flex justify-between items-center mb-6">
                 <button onClick={() => setShowTweetModal(false)} className="text-gray-500 p-2 hover:bg-red-500/10 rounded-full transition-colors"><X size={28} /></button>
                 <button onClick={handlePostTweet} disabled={!newTweetText.trim() || loading} className="bg-[#38B6FF] text-white px-8 py-2 rounded-full font-black shadow-lg transition-transform active:scale-95 disabled:opacity-50">
                    {loading ? '...' : t.post}
                 </button>
              </div>
              <div className="flex gap-4">
                 <img src={profileData.avatar} className="w-12 h-12 rounded-full object-cover shadow-sm" alt="modal-av" />
                 <div className="flex-1">
                    <textarea autoFocus value={newTweetText} onChange={(e) => setNewTweetText(e.target.value)} className="w-full bg-transparent text-xl outline-none resize-none min-h-[150px] placeholder:text-gray-500" placeholder={t.whatHappening} />
                    {newTweetImage && (
                      <div className="relative mt-2 rounded-2xl overflow-hidden mb-4 shadow-xl border border-gray-500/10">
                        <img src={newTweetImage} className="w-full max-h-60 object-cover" alt="prev-modal" />
                        <button onClick={() => setNewTweetImage("")} className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-red-500 transition-colors"><X size={16}/></button>
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-4 border-t border-gray-500/10 pt-4">
                       <button onClick={triggerTweetFile} className="p-2 text-[#38B6FF] hover:bg-[#38B6FF]/10 rounded-full transition-colors"><ImageIcon size={24} /></button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* التنقل للهاتف */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 p-4 border-t flex justify-around backdrop-blur-md z-40 ${isDarkMode ? 'bg-[#09142A]/95 border-gray-800 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]' : 'bg-white/95 border-gray-200 shadow-xl'}`}>
        <Home onClick={() => setView('feed')} className={view === 'feed' ? 'text-[#38B6FF] scale-110' : 'text-gray-400'} size={26} />
        <Users onClick={() => setView('friends')} className={view === 'friends' ? 'text-[#38B6FF] scale-110' : 'text-gray-400'} size={26} />
        <div className="relative -top-8">
           <button onClick={() => setShowTweetModal(true)} className="bg-[#38B6FF] text-white p-4 rounded-full shadow-2xl active:scale-90 transition-transform"><Plus size={30} /></button>
        </div>
        <User onClick={() => setView('profile')} className={view === 'profile' ? 'text-[#38B6FF] scale-110' : 'text-gray-400'} size={26} />
        <Settings onClick={() => setView('dashboard')} className={view === 'dashboard' ? 'text-[#38B6FF] scale-110' : 'text-gray-400'} size={26} />
      </nav>
    </div>
  );
}
