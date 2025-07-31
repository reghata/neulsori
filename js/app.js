// 전역 변수
const SPEECH_RATES = { 'normal': 1.0, 'slow': 0.7, 'verySlow': 0.5 };
let storage;
let currentSortOrder = 'alphabet';
let speechRate = 0.85;
let currentPlayingItem = null;
let isEditMode = false;
let voices = [];
let selectedVoiceIndex = -1;
let voiceGender = 'female';
let versionTapCount = 0;
let versionTapTimer;
let practiceWord = { text: '', id: null };
let currentPracticeMode = '';
let recognition;

window.onload = function() {
    storage = new DataStorage();
    applySettings();
    setupSpeechRecognition();
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js');
    }
    
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    loadVoices();
    
    setTimeout(() => {
        document.getElementById('splash-screen').classList.remove('active');
        showScreen('home-screen');
    }, 2000);
    
    const versionInfo = document.getElementById('version-info');
    if (versionInfo) {
        versionInfo.addEventListener('click', handleVersionClick);
    }
};

function handleVersionClick() {
    versionTapCount++;
    if (versionTapCount === 1) {
        versionTapTimer = setTimeout(() => { versionTapCount = 0; }, 3000);
    }
    if (versionTapCount === 5) {
        clearTimeout(versionTapTimer);
        versionTapCount = 0;
        showScreen('therapist-screen');
    }
}

function loadVoices() {
    voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
        selectVoiceByGender(storage.getSettings().voiceGender);
    }
}

function selectVoiceByGender(gender) {
    const availableVoices = window.speechSynthesis.getVoices();
    if (availableVoices.length === 0) return;
    
    const koreanVoices = availableVoices.filter(v => v.lang === 'ko-KR' || v.lang.startsWith('ko'));
    if (koreanVoices.length === 0) {
        selectedVoiceIndex = -1;
        return;
    }
    
    const genderKeywords = {
        female: ['female', '여성', '여자', 'woman', 'yuna', 'sun-hi', 'heami'],
        male: ['male', '남성', '남자', 'man', 'junho', 'injoon']
    };
    
    const preferredVoice = koreanVoices.find(v => genderKeywords[gender].some(k => v.name.toLowerCase().includes(k)));
    const finalVoice = preferredVoice || koreanVoices[0];
    selectedVoiceIndex = availableVoices.indexOf(finalVoice);
}

function showScreen(screenId, practiceMode = null) {
    window.scrollTo(0, 0);
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }

    if (screenId === 'conversation-screen') {
        changeSortOrder(currentSortOrder);
    } else if (screenId === 'practice-list-screen') {
        currentPracticeMode = practiceMode;
        document.getElementById('practice-list-title').textContent = 
            practiceMode === 'reading' ? '읽기 연습' : '따라말하기 연습';
        displayWords('practice-word-list-container', storage.getSortedWords('alphabet'));
    } else if (screenId === 'settings-screen') {
        highlightCurrentSettings();
    } else if (screenId === 'therapist-screen') {
        showStats();
    }
}

function displayWords(containerId, words) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    words.forEach(word => {
        const wordItem = document.createElement('div');
        wordItem.className = 'word-item';
        
        if (containerId === 'word-list-container') {
            if (!isEditMode) {
                wordItem.onclick = () => speak(word.text, word.id);
                wordItem.innerHTML = `<span class="word-text">${word.text}</span><button class="favorite-btn" onclick="toggleFavorite(${word.id}, event)">${word.isFavorite ? '⭐' : '☆'}</button>`;
            } else {
                wordItem.innerHTML = `<span class="word-text">${word.text}</span><button class="delete-btn" onclick="deleteWord(${word.id})">🗑️</button>`;
            }
        } else if (containerId === 'practice-word-list-container') {
            wordItem.onclick = () => startPractice(word);
            wordItem.innerHTML = `<span class="word-text">${word.text}</span>`;
        }
        container.appendChild(wordItem);
    });
}

function startPractice(word) {
    practiceWord = word;
    document.getElementById('target-word-display').textContent = practiceWord.text;
    document.getElementById('recognized-text-display').textContent = '-';
    document.getElementById('similarity-score-display').textContent = '0%';
    document.getElementById('mic-status').textContent = '버튼을 누르고 말씀하세요';
    document.getElementById('mic-btn').classList.remove('recording');
    
    const listenButtonContainer = document.getElementById('listen-button-container');
    const practiceTitle = document.getElementById('practice-title');

    if (currentPracticeMode === 'shadowing') {
        listenButtonContainer.style.display = 'block';
        practiceTitle.textContent = '따라말하기 연습';
        speak(practiceWord.text);
    } else { // reading
        listenButtonContainer.style.display = 'none';
        practiceTitle.textContent = '읽기 연습';
    }
    showScreen('practice-screen');
}

function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        console.error("이 브라우저는 음성 인식을 지원하지 않습니다.");
        return;
    }
    
    recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        document.getElementById('mic-btn').classList.add('recording');
        document.getElementById('mic-status').textContent = '듣고 있어요...';
    };

    recognition.onspeechend = () => {
        recognition.stop();
        document.getElementById('mic-btn').classList.remove('recording');
        document.getElementById('mic-status').textContent = '분석 중...';
    };

    recognition.onresult = (event) => {
        const spokenText = event.results[0][0].transcript;
        document.getElementById('recognized-text-display').textContent = spokenText;
        
        const similarity = calculateSimilarity(practiceWord.text, spokenText);
        document.getElementById('similarity-score-display').textContent = `${similarity.toFixed(0)}%`;
        document.getElementById('mic-status').textContent = '버튼을 누르고 다시 시도하세요';
    };

    recognition.onerror = (event) => {
        console.error('음성 인식 오류:', event.error);
        document.getElementById('mic-btn').classList.remove('recording');
        document.getElementById('mic-status').textContent = '오류가 발생했습니다. 다시 시도하세요.';
    };
}

function startRecognition() {
    if (recognition) {
        try {
            recognition.start();
        } catch(e) {
            console.error("음성 인식 시작 오류:", e);
            document.getElementById('mic-status').textContent = '음성 인식을 시작할 수 없습니다.';
        }
    } else {
        alert("음성 인식 기능이 초기화되지 않았습니다.");
    }
}

function calculateSimilarity(str1, str2) {
    str1 = str1.replace(/\s/g, '');
    str2 = str2.replace(/\s/g, '');
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    if (longer.length === 0) return 100.0;
    
    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length * 100.0;
}

function levenshteinDistance(a, b) {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    for (let i = 0; i <= a.length; i += 1) { matrix[0][i] = i; }
    for (let j = 0; j <= b.length; j += 1) { matrix[j][0] = j; }
    for (let j = 1; j <= b.length; j += 1) {
        for (let i = 1; i <= a.length; i += 1) {
            const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1,
                matrix[j - 1][i] + 1,
                matrix[j - 1][i - 1] + indicator,
            );
        }
    }
    return matrix[b.length][a.length];
}

function speak(text, wordId) {
    if (wordId) storage.incrementUseCount(wordId);
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = speechRate;
    const allVoices = window.speechSynthesis.getVoices();
    if (allVoices.length > 0 && selectedVoiceIndex !== -1) {
        utterance.voice = allVoices[selectedVoiceIndex];
    }
    utterance.onstart = () => {
        if (currentPlayingItem) currentPlayingItem.classList.remove('playing');
        const item = Array.from(document.querySelectorAll('.word-item')).find(el => el.querySelector('.word-text')?.textContent === text);
        if (item) { item.classList.add('playing'); currentPlayingItem = item; }
    };
    utterance.onend = () => {
        if (currentPlayingItem) currentPlayingItem.classList.remove('playing');
        currentPlayingItem = null;
    };
    window.speechSynthesis.speak(utterance);
}

function toggleFavorite(wordId, event) {
    event.stopPropagation();
    storage.toggleFavorite(wordId);
    changeSortOrder(currentSortOrder);
}

function addWord() {
    const modal = document.getElementById('add-word-modal');
    modal.style.display = 'block';
    const input = document.getElementById('new-word-input');
    input.focus();
    input.onkeypress = e => { if (e.key === 'Enter') confirmAddWord(); };
}

function confirmAddWord() {
    const input = document.getElementById('new-word-input');
    const text = input.value.trim();
    if (!text) return alert('단어를 입력해주세요!');
    
    const result = storage.addWord(text);
    closeAddWordModal();
    
    // 현재 활성화된 화면에 따라 목록을 새로고침
    const activeScreenId = document.querySelector('.screen.active').id;
    if (activeScreenId === 'conversation-screen') {
        changeSortOrder(currentSortOrder);
    } else if (activeScreenId === 'practice-list-screen') {
        // 'practice-list-screen'을 다시 로드하여 목록을 갱신
        showScreen('practice-list-screen', currentPracticeMode);
    }

    setTimeout(() => speak(result.word.text, result.word.id), 100);
}

function closeAddWordModal() {
    const modal = document.getElementById('add-word-modal');
    modal.style.display = 'none';
    document.getElementById('new-word-input').value = '';
}

function changeSortOrder(sortBy) {
    currentSortOrder = sortBy;
    ['sort-alpha', 'sort-fav', 'sort-freq'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.remove('active');
    });
    const activeEl = document.getElementById(sortBy === 'alphabet' ? 'sort-alpha' : sortBy === 'favorites' ? 'sort-fav' : 'sort-freq');
    if(activeEl) activeEl.classList.add('active');

    let wordsToShow;
    if (sortBy === 'favorites') {
        wordsToShow = storage.getFavoriteWords();
    } else {
        wordsToShow = storage.getSortedWords(sortBy);
    }
    displayWords('word-list-container', wordsToShow);
}

function changeFontSize(size) {
    document.body.className = `font-${size}`;
    storage.updateSettings({ fontSize: size });
    highlightCurrentSettings();
}

function changeSpeechRate(rate) {
    speechRate = SPEECH_RATES[rate];
    storage.updateSettings({ speechRate: rate });
    highlightCurrentSettings();
    speak('안녕하세요');
}

function changeVoiceGender(gender) {
    storage.updateSettings({ voiceGender: gender });
    selectVoiceByGender(gender);
    highlightCurrentSettings();
    speak('안녕하세요');
}

function highlightCurrentSettings() {
    const settings = storage.getSettings();
    document.querySelectorAll('[data-setting-value]').forEach(btn => {
        const parentDiv = btn.parentElement.parentElement;
        const key = parentDiv.querySelector('h3').textContent;
        let settingKey;
        if (key === '글자 크기') settingKey = 'fontSize';
        else if (key === '말하기 속도') settingKey = 'speechRate';
        else if (key === '음성 선택') settingKey = 'voiceGender';
        
        if (settingKey) {
            btn.classList.toggle('active', btn.dataset.settingValue === settings[settingKey]);
        }
    });
}

function applySettings() {
    const settings = storage.getSettings();
    document.body.className = `font-${settings.fontSize}`;
    speechRate = SPEECH_RATES[settings.speechRate] || SPEECH_RATES['verySlow'];
    voiceGender = settings.voiceGender || 'female';
    selectVoiceByGender(voiceGender);
}

function toggleEditMode() {
    isEditMode = !isEditMode;
    document.getElementById('edit-mode-btn').textContent = isEditMode ? '✓' : '✏️';
    document.getElementById('word-list-container').classList.toggle('edit-mode', isEditMode);
    changeSortOrder(currentSortOrder);
}

function deleteWord(wordId) {
    const word = storage.getAllWords().find(w => w.id === wordId);
    if (confirm(`"${word.text}"를 삭제하시겠습니까?`)) {
        storage.deleteWord(wordId);
        changeSortOrder(currentSortOrder);
    }
}

function importWords(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        let addedCount = 0;
        lines.forEach(line => {
            if (storage.addWord(line).success) addedCount++;
        });
        alert(`${addedCount}개의 새 단어를 추가했습니다.`);
        changeSortOrder(currentSortOrder);
    };
    reader.readAsText(file);
    event.target.value = '';
}

function exportWords() {
    const csv = storage.getAllWords().map(w => w.text).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `늘소리_단어목록_${new Date().toLocaleDateString()}.csv`;
    link.click();
}

function resetApp() {
    if (confirm('모든 데이터가 삭제됩니다. 정말 초기화하시겠습니까?')) {
        if (confirm('정말로 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            localStorage.clear();
            location.reload();
        }
    }
}

function bulkAddWords() {
    const textarea = document.getElementById('bulk-words');
    const words = textarea.value.split('\n').map(w => w.trim()).filter(w => w);
    if (words.length === 0) return;

    let addedCount = 0;
    words.forEach(word => {
        if (storage.addWord(word).success) addedCount++;
    });
    
    const button = document.querySelector('#therapist-screen button[onclick="bulkAddWords()"]');
    const originalText = button.textContent;
    button.textContent = addedCount > 0 ? `${addedCount}개의 단어가 추가되었습니다.` : '추가할 새 단어가 없습니다.';
    textarea.value = '';
    showStats();
    
    setTimeout(() => { button.textContent = originalText; }, 2000);
}

function generateShareCode() { /* ... */ }

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
    
    const statsDisplay = document.getElementById('stats-display');
    if (statsDisplay) {
        statsDisplay.innerHTML = statsHTML;
    }
}
