document.addEventListener('DOMContentLoaded', () => {

    // 1. تعريف عناصر DOM
    const prepMenuEl = document.getElementById('prepMenu');
    const prepCardsPopupEl = document.getElementById('prepCardsPopup');
    const closePrepCardsEl = document.getElementById('closePrepCards');
    const prepCardsContainerEl = document.getElementById('prepCardsContainer');
    const prepCardsTitleEl = document.getElementById('prepCardsTitle');
    const sidebarEl = document.getElementById('sidebar');
    const sidebarBackdropEl = document.getElementById('sidebarBackdrop');

    // بيانات التهيئة
    const prepData = [
            { img: 'images/gg1.jpg', text: ' التعرف على الالعاب الجميلة 1.', url: 'moredata/game.html' },
            { img: 'images/background.jpg', text: 'التعرف على الادوات المدرسية 2. ', url: 'moredata/game2.html' },
            { img: 'images/dds.jpg', text: '3 اختر الكلمة الصحيحة للصورة.', url: 'moredata/game3.html' },
            { img: 'images/ddfg.jpg', text: ' اضغط عل الحيوانات والاشياء للتعرف على صوتها 4', url: 'moredata/game4.html' },
            { img: 'images/ftr.jpg', text: 'البحث عن الاشياء 5. ', url: 'moredata/game5.html' },
            { img: 'images/ga6.jpg', text: ' قم بمطابقة اجزاء الحيوانات وتعرف عليها 6.', url: 'moredata/game6.html' },
            { img: 'images/game7.jpg', text: 'ارسم فوق الاشياء وتتبعها وتعرف عليها 7.', url: 'moredata/game7.html' },
            { img: 'images/ga8.jpg', text: 'حرك الاشياء نحو اهدافها 8.', url: 'moredata/game8.html' },
            { img: 'images/ga9.jpg', text: 'صل بين الاشياء المتشابهة 9.', url: 'moredata/game9.html' },
            { img: 'images/ga10.jpg', text: 'ارسم فوق الاشكال الجميلة 10.', url: 'moredata/game10.html' },
            { img: 'images/game11.jpg', text: 'اكمل رسم الحيوانات الجميلة 11.', url: 'moredata/game11.html' },
            { img: 'images/ga12.jpg', text: ' اكمل رسم الادوات المساعدة لنا 12.', url: 'moredata/game12.html' },
            { img: 'images/ga13.jpg', text: 'تعرف على قصة النملة والطير 13 .', url: 'moredata/game13.html' },
            { img: 'images/ga14.jpg', text: 'الذهاب الى المدرسة 14 .', url: 'moredata/game14.html' },
            { img: 'images/ga15.jpg', text: 'الطريق والمرور والوصول الى المدرسة 15 .', url: 'moredata/game15.html' },
            { img: 'images/ga16.jpg', text: 'استمع الى سورة الفاتحة وردد معها 16.', url: 'moredata/game16.html' },
            { img: 'images/ga17.jpg', text: 'عائلتي التي احبها .', url: 'moredata/game17.html' }
    ];

    // تحميل الصور مسبقاً لضمان السرعة
    function preloadPrepImages() {
        prepData.forEach(item => {
            const img = new Image();
            img.src = item.img;
        });
    }
    preloadPrepImages();

    // دالة عرض البطاقات
    function showPrepCards() {
        if (!prepCardsContainerEl) return;
        
        // 1. حفظ الحالة: نخبر المتصفح أن النافذة "مفتوحة" الآن
        sessionStorage.setItem('isPrepPopupOpen', 'true');

        prepCardsTitleEl.textContent = `بطاقات التهيئة للصف الأول`;
        prepCardsContainerEl.innerHTML = '';
    
        prepData.forEach(card => {
            if (!card.url) return;

            const cardEl = document.createElement('a');
            cardEl.className = 'prep-card';
            cardEl.href = card.url;
            
            // محاولة فتح في نافذة جديدة (قد يفتح في نفس النافذة في الويب فيو حسب الإعدادات)
            cardEl.target = '_blank'; 
            cardEl.title = `فتح نشاط: ${card.text}`;
            
            cardEl.onclick = (e) => {
                // حفظ الحالة مرة أخرى للتأكيد قبل الانتقال
                sessionStorage.setItem('isPrepPopupOpen', 'true');
                e.stopPropagation(); 
            };
            
            cardEl.innerHTML = `
                <div class="prep-card-image">
                    <img src="${card.img}" alt="${card.text.substring(0, 20)}" loading="eager">
                </div>
                <div class="prep-card-description">
                    ${card.text}
                </div>
            `;
            prepCardsContainerEl.appendChild(cardEl);
        });
        
        if (prepCardsPopupEl) {
            prepCardsPopupEl.style.display = 'flex';
            prepCardsPopupEl.style.zIndex = '2500'; 
        }
    }
   
    window.showPrepCards = showPrepCards;
    
    // ربط القائمة الجانبية
    if (prepMenuEl) {
        prepMenuEl.addEventListener('click', () => {
            showPrepCards();
            if (sidebarEl) sidebarEl.classList.remove('active');
            if (sidebarBackdropEl) sidebarBackdropEl.classList.remove('active');
        });
    }
    
    // زر الإغلاق: هنا فقط نقوم بإزالة الحالة وإخفاء النافذة
    if (closePrepCardsEl) {
        closePrepCardsEl.addEventListener('click', () => {
            // 2. إزالة الحالة: نخبر المتصفح أن المستخدم أغلق النافذة بيده
            sessionStorage.removeItem('isPrepPopupOpen');
            prepCardsPopupEl.style.display = 'none';
        });
    }

    // ============================================================
    // 👇👇 الكود السحري: استعادة الحالة عند العودة أو التحديث 👇👇
    // ============================================================
    const shouldBeOpen = sessionStorage.getItem('isPrepPopupOpen');
    if (shouldBeOpen === 'true') {
        // إذا كانت النافذة مفتوحة سابقاً، أعد فتحها فوراً
        showPrepCards();
        
        // إغلاق أي نوافذ أخرى قد تظهر فوقها بالخطأ (مثل القائمة الجانبية)
        if (sidebarEl) sidebarEl.classList.remove('active');
        if (sidebarBackdropEl) sidebarBackdropEl.classList.remove('active');
    }
});
