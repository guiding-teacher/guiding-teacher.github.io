
 
 
    // --- Configuration and Initialization ---
    const firebaseConfig = { apiKey: "AIzaSyBo3jI4fVUYZdz_SvVkIDslwpKsvYd2254", authDomain: "comments-system-8158e.firebaseapp.com", projectId: "comments-system-8158e", storageBucket: "comments-system-8158e.appspot.com", messagingSenderId: "1033836980839", appId: "1:1033836980839:web:08675b0419bbbd6b2fc2c2" };
    const DOM = { videoPostsList: document.getElementById('video-posts-list'), pagination: document.getElementById('pagination'), prevBtn: document.getElementById('prev-btn'), nextBtn: document.getElementById('next-btn'), pageIndicator: document.getElementById('page-indicator'), lightbox: document.getElementById('lightbox'), lightboxImg: document.getElementById('lightbox-img'), lightboxDownload: document.getElementById('lightbox-download'), lightboxClose: document.querySelector('.lightbox-close') };
    const LIKED_POSTS_KEY = 'likedVideoPosts';
    let db;
    window.fbAsyncInit = function() { FB.init({ xfbml: true, version: 'v18.0' }); };

    (async function initApp() {
        try {
            if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
            db = firebase.firestore();
            await db.collection('testConnection').doc('test').get();
            await loadPosts();
            setupLightbox();
        } catch (e) {
            console.error("Firebase initialization error:", e);
            DOM.videoPostsList.innerHTML = `<p class="status-message" style="color: #F44336;"><i class="fas fa-exclamation-triangle"></i> خطأ في الاتصال بالنظام</p>`;
        }
    })();
    
    // --- Pagination Logic ---
    let currentPage = 1;
    const postsPerPage = 10;
    let lastDocOfCurrentPage = null;
    let pageHistory = []; 

    async function loadPosts(direction = 'initial') {
        DOM.videoPostsList.innerHTML = `<p class="status-message"><span class="loading-spinner"></span> جاري تحميل المنشورات...</p>`;
        DOM.pagination.style.display = 'none';

        try {
            let query = db.collection('videoPosts').orderBy('timestamp', 'desc');

            if (direction === 'next' && lastDocOfCurrentPage) {
                query = query.startAfter(lastDocOfCurrentPage);
                currentPage++;
            } else if (direction === 'prev' && currentPage > 1) {
                const startOfPrevPage = pageHistory[currentPage - 2];
                query = query.startAt(startOfPrevPage || null).limit(postsPerPage);
                currentPage--;
            } else {
                 query = query.limit(postsPerPage);
                 currentPage = 1;
                 pageHistory = [];
            }
            
            const snapshot = await query.get();
            const posts = snapshot.docs.map(doc => ({ id: doc.id, data: doc.data(), docRef: doc }));

            if (posts.length === 0 && direction === 'initial') {
                DOM.videoPostsList.innerHTML = `<p class="status-message"><i class="far fa-folder-open"></i> لا توجد منشورات لعرضها.</p>`;
                return;
            }

            DOM.videoPostsList.innerHTML = '';
            posts.forEach((post, index) => displayVideoPost(post.data, post.id, index));
            
            lastDocOfCurrentPage = posts[posts.length - 1]?.docRef;
            if (direction !== 'prev' && posts.length > 0) {
                pageHistory[currentPage - 1] = posts[0].docRef;
            }
            
            updatePaginationControls(posts.length);
            
            if (typeof FB !== 'undefined' && FB.XFBML) {
                FB.XFBML.parse(DOM.videoPostsList);
            }

        } catch (error) {
            console.error("Error loading posts:", error);
            DOM.videoPostsList.innerHTML = `<p class="status-message" style="color: #F44336;"><i class="fas fa-exclamation-triangle"></i> حدث خطأ أثناء تحميل المنشورات</p>`;
        }
    }

    function updatePaginationControls(countOnPage) {
        DOM.prevBtn.disabled = currentPage === 1;
        DOM.nextBtn.disabled = countOnPage < postsPerPage;
        DOM.pageIndicator.textContent = `صفحة ${currentPage}`;
        DOM.pagination.style.display = 'flex';
    }

    function linkify(htmlContent) {
        if (!htmlContent) return '';
        const urlRegex = /(https?:\/\/[^\s<>"']+)/g;
        return htmlContent.replace(urlRegex, (url) => {
            if (htmlContent.includes(`href="${url}"`)) { return url; }
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
        });
    }

    // --- Post Rendering ---
    function displayVideoPost(post, postId, index) {
        const postElement = document.createElement('div');
        postElement.className = 'video-post-item';
        postElement.dataset.postId = postId;
        postElement.style.animationDelay = `${index * 0.1}s`;

        const isLiked = isPostLiked(postId);
        let mediaContent = '';
        
        if (post.imageUrl) {
            mediaContent = `<div class="video-image-preview-wrapper"><img src="${post.imageUrl}" alt="${escapeHtml(post.title)}" class="video-image-preview"></div>`;
        } else if (post.videoUrl) {
            const wrapperStyle = post.type === 'tiktok' ? 'padding-bottom:125%;' : '';
            mediaContent = `<div class="video-player-wrapper" style="${wrapperStyle}">${generateVideoEmbed(post.videoUrl, post.type)}</div>`;
        }
        
        let displayDateObj = post.lastUpdated?.toDate() || post.timestamp?.toDate();
        let updatedText = post.lastUpdated ? `<span class="updated-label">(محدث)</span>` : '';
        const formattedDate = formatDate(displayDateObj);
        
        const processedDescription = linkify(post.description || '');

        postElement.innerHTML = `
            <div class="video-header">
                <h2 class="video-title">${escapeHtml(post.title)}</h2>
                <div class="video-meta">
                    <span><i class="far fa-clock"></i>${formattedDate} ${updatedText}</span>
                    <span><i class="fas fa-user-circle"></i> المعلم المرشد</span>
                </div>
            </div>
            <div class="media-container">${mediaContent}</div>
            <div class="video-content">
                <hr class="golden-divider">
                <div class="video-description ql-editor">${processedDescription}</div>
                <hr class="golden-divider">
            </div>
            <div class="video-actions">
                ${post.imageUrl ? `<button class="download-btn" data-url="${post.imageUrl}"><i class="fas fa-download"></i> تحميل</button>` : ''}
                <button class="like-btn ${isLiked ? 'liked' : ''}">
                    <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
                    <span class="like-count">${post.likesCount || 0}</span>
                </button>
            </div>`;
        DOM.videoPostsList.appendChild(postElement);
        
        // --- تعديل: تمت إعادة كتابة هذا الجزء لإضافة نص قبل الرابط ---
        const descriptionLinks = postElement.querySelectorAll('.video-description a');
        descriptionLinks.forEach(link => {
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            
            // تحقق من عدم إضافة النص المساعد أكثر من مرة
            if (!link.previousElementSibling || !link.previousElementSibling.classList.contains('link-helper-text')) {
                const prefixText = document.createElement('span');
                prefixText.className = 'link-helper-text';
                prefixText.textContent = 'الدخول للخدمة:'; // النص الجديد
                link.parentNode.insertBefore(prefixText, link); // إدراج النص قبل الرابط
            }
        });
        
        postElement.querySelector('.like-btn').addEventListener('click', (e) => handleLike(e.currentTarget, postId));
        const downloadBtn = postElement.querySelector('.download-btn');
        if (downloadBtn) downloadBtn.addEventListener('click', (e) => handleDownload(e.currentTarget.dataset.url));
        const imagePreview = postElement.querySelector('.video-image-preview');
        if(imagePreview) imagePreview.addEventListener('click', () => showLightbox(post.imageUrl));
    }

    // --- Media Embed Logic ---
    function generateVideoEmbed(url, type) {
        if (!url) return '';
        try {
            if (type === 'iframe' || url.trim().toLowerCase().startsWith('<iframe')) return url;
            const youtubeId = (type === 'youtube') ? url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/) : null;
            if (youtubeId && youtubeId[2].length === 11) return `<iframe src="https://www.youtube.com/embed/${youtubeId[2]}?rel=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
            const vimeoId = (type === 'vimeo') ? url.match(/(vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/) : null;
            if (vimeoId) return `<iframe src="https://player.vimeo.com/video/${vimeoId[2]}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
            if (type === 'mp4') return `<video controls style="width:100%;height:100%;"><source src="${url}" type="video/mp4"></video>`;
            if (type === 'tiktok') {
                const videoIdMatch = url.match(/video\/(\d+)/);
                if (videoIdMatch && videoIdMatch[1]) return `<iframe src="https://www.tiktok.com/embed/v2/${videoIdMatch[1]}" allowfullscreen scrolling="no" allow="autoplay; encrypted-media;" style="width: 100%; height: 100%; position: absolute; top:0; left: 0; border: none;"></iframe>`;
            }
            if (type === 'facebook') return `<div class="fb-video" data-href="${url}" data-width="auto" data-show-text="false" data-allowfullscreen="true"></div>`;
        } catch (e) { console.error("Embed Error:", e); }
        return `<p style="color:red;padding:20px;">تعذر عرض المحتوى.</p>`;
    }

    // --- Event Handlers & Helpers ---
    async function handleLike(button, postId) {
        const isLiked = button.classList.contains('liked');
        const increment = isLiked ? -1 : 1;
        
        button.classList.toggle('liked');
        button.querySelector('i').className = isLiked ? 'far fa-heart' : 'fas fa-heart';
        const likeCountSpan = button.querySelector('.like-count');
        likeCountSpan.textContent = parseInt(likeCountSpan.textContent) + increment;
        
        if (isLiked) removeLikedPost(postId); else saveLikedPost(postId);
        
        try {
            await db.collection('videoPosts').doc(postId).update({ likesCount: firebase.firestore.FieldValue.increment(increment) });
        } catch (error) { console.error("Error updating like:", error); }
    }
    
    function handleDownload(imageUrl) { const link = document.createElement('a'); link.href = imageUrl; link.download = imageUrl.split('/').pop() || 'image.jpg'; document.body.appendChild(link); link.click(); document.body.removeChild(link); }
    
    function setupLightbox() {
        DOM.lightbox.addEventListener('click', () => DOM.lightbox.classList.remove('active'));
        DOM.lightboxClose.addEventListener('click', (e) => { e.stopPropagation(); DOM.lightbox.classList.remove('active'); });
    }
    function showLightbox(imageUrl) {
        DOM.lightboxImg.src = imageUrl;
        DOM.lightboxDownload.href = imageUrl;
        DOM.lightboxDownload.download = imageUrl.split('/').pop() || 'image.jpg';
        DOM.lightbox.classList.add('active');
    }

    // Local Storage for Likes
    function getLikedPosts() { return JSON.parse(localStorage.getItem(LIKED_POSTS_KEY) || '[]'); }
    function saveLikedPost(postId) { const l = getLikedPosts(); if (!l.includes(postId)) { l.push(postId); localStorage.setItem(LIKED_POSTS_KEY, JSON.stringify(l)); } }
    function removeLikedPost(postId) { localStorage.setItem(LIKED_POSTS_KEY, JSON.stringify(getLikedPosts().filter(id => id !== postId))); }
    function isPostLiked(postId) { return getLikedPosts().includes(postId); }

    // Utility Functions
    function escapeHtml(text) { if (!text) return ''; const d = document.createElement('div'); d.textContent = text; return d.innerHTML; }
    function formatDate(date) { if (!date) return 'غير معروف'; return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(date); }

    // Pagination event listeners
    DOM.prevBtn.addEventListener('click', () => loadPosts('prev'));
    DOM.nextBtn.addEventListener('click', () => loadPosts('next'));
   
 
 
   
