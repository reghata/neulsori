// 전역 변수
let storage;
let currentSortOrder = 'alphabet';
let speechRate = 0.85;
let currentPlayingItem = null;
let isEditMode = false;
let voices = [];
let selectedVoiceIndex = 0;
let voiceGender = 'female';
let versionTapCount = 0;
let versionTapTimer;

window.onload = function() {
    storage = new DataStorage();
    
    // 설정 적용
    applySettings();
    
    // Service Worker 등록
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then(registration => {
                console.log('Service Worker 등록 성공:', registration);
            })
            .catch(error => {
                console.log('Service Worker 등록 실패:', error);
            });
    }
    
    // 음성 로드
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    // 2초 후 메인 화면으로
    setTimeout(() => {
        const splashScreen = document.getElementById('splash-screen');
        if (splashScreen) {
            splashScreen.classList.remove('active');
        }
        
        const mainScreen = document.getElementById('main-screen');
        if (mainScreen) {
            mainScreen.classList.add('active');
        }
    }, 2000);
    
    // 치료사 모드 이벤트 리스너
    const versionInfo = document.getElementById('version-info');
    if (versionInfo) {
        versionInfo.addEventListener('click', handleVersionClick);
    }
};

function handleVersionClick() {
    versionTapCount++;
    
    if (versionTapCount === 1) {
        versionTapTimer = setTimeout(() => {
            versionTapCount = 0;
        }, 3000);
    }
    
    if (versionTapCount === 5) {
        clearTimeout(versionTapTimer);
        versionTapCount = 0;
        showScreen('therapist-screen');
        showStats();
    }
}

// 음성 목록 로드
function loadVoices() {
    voices = window.speechSynthesis.getVoices();
    const koreanVoices = voices.filter(voice => voice.lang === 'ko-KR' || voice.lang.startsWith('ko'));
    console.log('사용 가능한 한국어 음성:', koreanVoices.map(v => v.name));
    selectVoiceByGender(storage.getSettings().voiceGender);
}

// 성별에 따른 음성 선택
function selectVoiceByGender(gender) {
    const koreanVoices = voices.filter(voice => voice.lang === 'ko-KR' || voice.lang.startsWith('ko'));
    if (koreanVoices.length === 0) return;
    
    const genderKeywords = {
        female: ['female', '여성', '여자', 'woman', 'yuna', 'sun-hi'],
        male: ['male', '남성', '남자', 'man', 'junho', 'injoon']
    };
    
    const preferredVoice = koreanVoices.find(voice => 
        genderKeywords[gender].some(keyword => voice.name.toLowerCase().includes(keyword))
    );
    
    selectedVoiceIndex = voices.indexOf(preferredVoice || koreanVoices[0]);
    console.log(`${gender} 음성 선택:`, voices[selectedVoiceIndex].name);
}

// 화면 전환
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    
    if (screenId === 'speak-screen') {
        displayWords('speak-word-list', storage.getSortedWords('alphabet'));
    } else if (screenId === 'favorites-screen') {
        displayWords('favorites-word-list', storage.getFavoriteWords());
    } else if (screenId === 'all-words-screen') {
        displayWords('all-words-list', storage.getSortedWords(currentSortOrder));
    } else if (screenId === 'settings-screen') {
        highlightCurrentSettings();
    }
}

// 음성 재생
function speak(text, wordId) {
    if (wordId) storage.incrementUseCount(wordId);
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = speechRate;
    if (voices.length > 0) utterance.voice = voices[selectedVoiceIndex];
    
    utterance.onstart = () => {
        if (currentPlayingItem) currentPlayingItem.classList.remove('playing');
        const item = Array.from(document.querySelectorAll('.word-item')).find(el => el.querySelector('.word-text')?.textContent === text);
        if (item) {
            item.classList.add('playing');
            currentPlayingItem = item;
        }
    };
    utterance.onend = () => {
        if (currentPlayingItem) currentPlayingItem.classList.remove('playing');
        currentPlayingItem = null;
    };
    
    window.speechSynthesis.speak(utterance);
}

// 즐겨찾기 토글
function toggleFavorite(wordId, event) {
    event.stopPropagation();
    storage.toggleFavorite(wordId);
    const currentScreenId = document.querySelector('.screen.active').id;
    showScreen(currentScreenId);
}

// 단어 추가 모달 열기
function addWord() {
    const modal = document.getElementById('add-word-modal');
    modal.style.display = 'block';
    const input = document.getElementById('new-word-input');
    input.focus();
    input.onkeypress = e => { if (e.key === 'Enter') confirmAddWord(); };
}

// 단어 추가 확인
function confirmAddWord() {
    const input = document.getElementById('new-word-input');
    const text = input.value.trim();
    if (!text) return alert('단어를 입력해주세요!');
    
    const result = storage.addWord(text);
    closeAddWordModal();
    showScreen(document.querySelector('.screen.active').id);
    setTimeout(() => speak(result.word.text, result.word.id), 100);
}

// 단어 추가 모달 닫기
function closeAddWordModal() {
    const modal = document.getElementById('add-word-modal');
    modal.style.display = 'none';
    document.getElementById('new-word-input').value = '';
}

// 정렬 순서 변경
function changeSortOrder(sortBy) {
    currentSortOrder = sortBy;
    document.getElementById('sort-alpha').classList.toggle('active', sortBy === 'alphabet');
    document.getElementById('sort-freq').classList.toggle('active', sortBy === 'frequency');
    displayWords('all-words-list', storage.getSortedWords(currentSortOrder));
}

// 글자 크기 변경
function changeFontSize(size, event) {
    document.body.className = `font-${size}`;
    storage.updateSettings({ fontSize: size });
    highlightCurrentSettings();
}

// 말하기 속도 변경
function changeSpeechRate(rate, event) {
    const rates = { 'normal': 1.0, 'slow': 0.85, 'verySlow': 0.75 };
    speechRate = rates[rate];
    storage.updateSettings({ speechRate: rate });
    highlightCurrentSettings();
    speak('안녕하세요');
}

// 음성 성별 변경
function changeVoiceGender(gender, event) {
    storage.updateSettings({ voiceGender: gender });
    selectVoiceByGender(gender);
    highlightCurrentSettings();
    speak('안녕하세요');
}

// 현재 설정값에 맞게 버튼 활성화
function highlightCurrentSettings() {
    const settings = storage.getSettings();
    
    document.querySelectorAll('[data-setting-value]').forEach(btn => {
        const key = btn.parentElement.previousElementSibling.textContent;
        let settingKey;
        if (key === '글자 크기') settingKey = 'fontSize';
        else if (key === '말하기 속도') settingKey = 'speechRate';
        else if (key === '음성 선택') settingKey = 'voiceGender';
        
        if (settingKey) {
            btn.classList.toggle('active', btn.dataset.settingValue === settings[settingKey]);
        }
    });
}

// 저장된 설정 적용
function applySettings() {
    const settings = storage.getSettings();
    document.body.className = `font-${settings.fontSize}`;
    const rates = { 'normal': 1.0, 'slow': 0.85, 'verySlow': 0.75 };
    speechRate = rates[settings.speechRate] || 0.75;
    voiceGender = settings.voiceGender || 'female';
    selectVoiceByGender(voiceGender);
}

// 편집 모드 토글
function toggleEditMode() {
    isEditMode = !isEditMode;
    document.getElementById('edit-mode-btn').textContent = isEditMode ? '✓' : '✏️';
    document.getElementById('all-words-list').classList.toggle('edit-mode', isEditMode);
    displayWords('all-words-list', storage.getSortedWords(currentSortOrder));
}

// 단어 목록 표시
function displayWords(containerId, words) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    words.forEach(word => {
        const wordItem = document.createElement('div');
        wordItem.className = 'word-item';
        
        if (!isEditMode || containerId !== 'all-words-list') {
            wordItem.onclick = e => {
                if (!e.target.classList.contains('favorite-btn')) speak(word.text, word.id);
            };
            wordItem.innerHTML = `<span class="word-text">${word.text}</span><button class="favorite-btn" onclick="toggleFavorite(${word.id}, event)">${word.isFavorite ? '⭐' : '☆'}</button>`;
        } else {
            wordItem.innerHTML = `<span class="word-text">${word.text}</span><button class="delete-btn" onclick="deleteWord(${word.id})">🗑️</button>`;
        }
        container.appendChild(wordItem);
    });
}

// 단어 삭제
function deleteWord(wordId) {
    const word = storage.data.words.find(w => w.id === wordId);
    if (confirm(`"${word.text}"를 삭제하시겠습니까?`)) {
        storage.deleteWord(wordId);
        displayWords('all-words-list', storage.getSortedWords(currentSortOrder));
    }
}

// CSV 가져오기
function importWords(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        
        let addedCount = 0;
        lines.forEach(line => {
            const result = storage.addWord(line);
            if (result.success) addedCount++;
        });
        
        alert(`${addedCount}개의 새 단어를 추가했습니다.`);
        showScreen('main-screen');
    };
    
    reader.readAsText(file);
    event.target.value = ''; // 파일 입력 초기화
}

// CSV 내보내기
function exportWords() {
    const words = storage.getAllWords();
    const csv = words.map(w => w.text).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `늘소리_단어목록_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 앱 초기화
function resetApp() {
    if (confirm('모든 데이터가 삭제됩니다. 정말 초기화하시겠습니까?')) {
        if (confirm('정말로 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            localStorage.clear();
            location.reload();
        }
    }
}

document.getElementById('version-info').addEventListener('click', () => {
    versionTapCount++;
    
    if (versionTapCount === 1) {
        versionTapTimer = setTimeout(() => {
            versionTapCount = 0;
        }, 3000);
    }
    
    if (versionTapCount === 5) {
        clearTimeout(versionTapTimer);
        versionTapCount = 0;
        showScreen('therapist-screen');
        showStats();
    }
});

// 일괄 단어 추가
function bulkAddWords() {
    const textarea = document.getElementById('bulk-words');
    const words = textarea.value.split('\n').map(w => w.trim()).filter(w => w);
    
    let addedCount = 0;
    words.forEach(word => {
        const result = storage.addWord(word);
        if (result.success) addedCount++;
    });
    
    alert(`${addedCount}개의 단어가 추가되었습니다.`);
    textarea.value = '';
}

// 공유 코드 생성
function generateShareCode() {
    const words = storage.getAllWords().map(w => w.text);
    const data = {
        words: words,
        settings: storage.getSettings(),
        date: new Date().toISOString()
    };
    
    // 간단한 인코딩
    const code = btoa(JSON.stringify(data)).substr(0, 8).toUpperCase();
    
    document.getElementById('share-code').value = code;
    document.getElementById('share-code-display').style.display = 'block';
    
    // 클립보드 복사
    document.getElementById('share-code').onclick = function() {
        this.select();
        document.execCommand('copy');
        alert('코드가 복사되었습니다!');
    };
}

// 통계 표시
function showStats() {
    const words = storage.getAllWords();
    const totalUse = words.reduce((sum, w) => sum + w.useCount, 0);
    const favorites = words.filter(w => w.isFavorite).length;
    const mostUsed = [...words].sort((a, b) => b.useCount - a.useCount).slice(0, 5);
    
    const statsHTML = `
        <p>총 단어 수: ${words.length}개</p>
        <p>즐겨찾기: ${favorites}개</p>
        <p>총 사용 횟수: ${totalUse}회</p>
        <h4>자주 사용한 단어 TOP 5</h4>
        <ol>
            ${mostUsed.map(w => `<li>${w.text} (${w.useCount}회)</li>`).join('')}
        </ol>
    `;
    
    document.getElementById('stats-display').innerHTML = statsHTML;
}
