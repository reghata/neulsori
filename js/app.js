
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
    
    // 음성 로드 추가
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    // 2초 후 메인 화면으로
    setTimeout(() => {
        const splashScreen = document.getElementById('splash-screen');
        if (splashScreen) {
            splashScreen.style.display = 'none';
            splashScreen.classList.remove('active');
        }
        
        const mainScreen = document.getElementById('main-screen');
        if (mainScreen) {
            mainScreen.style.display = 'block';
            mainScreen.classList.add('active');
        }
    }, 2000);
    
    // 치료사 모드 이벤트 리스너 추가 (여기에!)
    const versionInfo = document.getElementById('version-info');
    if (versionInfo) {
        versionInfo.addEventListener('click', () => {
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
    
    // 한국어 음성만 필터링
    const koreanVoices = voices.filter(voice => 
        voice.lang === 'ko-KR' || voice.lang.startsWith('ko')
    );
    
    console.log('사용 가능한 한국어 음성:', koreanVoices.map(v => v.name));
    
    // 초기 음성 선택
    selectVoiceByGender(voiceGender);
}

// 성별에 따른 음성 선택
function selectVoiceByGender(gender) {
    const koreanVoices = voices.filter(voice => 
        voice.lang === 'ko-KR' || voice.lang.startsWith('ko')
    );
    
    if (koreanVoices.length === 0) {
        console.log('한국어 음성이 없습니다');
        return;
    }
    
    // 성별 키워드로 음성 찾기
    const genderKeywords = {
        female: ['female', '여성', '여자', 'woman', 'Female', '은영', '유나', 'Yuna', 'Sun-Hi'],
        male: ['male', '남성', '남자', 'man', 'Male', '민기', '준호', 'Junho', 'InJoon']
    };
    
    // 성별에 맞는 음성 찾기
    const preferredVoice = koreanVoices.find(voice => {
        const voiceName = voice.name.toLowerCase();
        return genderKeywords[gender].some(keyword => 
            voiceName.includes(keyword.toLowerCase())
        );
    });
    
    if (preferredVoice) {
        selectedVoiceIndex = voices.indexOf(preferredVoice);
        console.log(`${gender} 음성 선택:`, preferredVoice.name);
    } else {
        // 성별 음성을 못 찾으면 첫 번째 한국어 음성 사용
        selectedVoiceIndex = voices.indexOf(koreanVoices[0]);
        console.log('기본 한국어 음성 사용:', koreanVoices[0].name);
    }
}

// 화면 전환
function showScreen(screenId) {
    // 모든 화면 숨기기
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // 선택한 화면 보이기
    document.getElementById(screenId).classList.add('active');
    
    // 설정 다시 적용 (이 부분 추가!)
    applySettings();
    
    // 화면별 데이터 로드
    if (screenId === 'speak-screen') {
        displayWords('speak-word-list', storage.getAllWords());
    } else if (screenId === 'favorites-screen') {
        displayWords('favorites-word-list', storage.getFavoriteWords());
    } else if (screenId === 'all-words-screen') {
        displayWords('all-words-list', storage.getSortedWords(currentSortOrder));
    }
        // 설정 화면일 때 현재 설정 표시
    if (screenId === 'settings-screen') {
        highlightCurrentSettings();
    }
}


// speak 함수 수정
function speak(text, wordId) {
    if (wordId) {
        storage.incrementUseCount(wordId);
    }
    
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = speechRate;
    
    // 선택된 음성 사용
    if (voices.length > 0 && selectedVoiceIndex < voices.length) {
        utterance.voice = voices[selectedVoiceIndex];
    }
    
    utterance.onstart = () => {
        if (currentPlayingItem) {
            currentPlayingItem.classList.remove('playing');
        }
        
        const wordItems = document.querySelectorAll('.word-item');
        wordItems.forEach(item => {
            if (item.querySelector('.word-text') && 
                item.querySelector('.word-text').textContent === text) {
                item.classList.add('playing');
                currentPlayingItem = item;
            }
        });
    };
    
    window.speechSynthesis.speak(utterance);
}

// 즐겨찾기 토글
function toggleFavorite(wordId, event) {
    event.stopPropagation();  // 클릭 이벤트 전파 중지
    storage.toggleFavorite(wordId);
    
    // 현재 화면 새로고침
    const currentScreen = document.querySelector('.screen.active').id;
    showScreen(currentScreen);
}

// 새 단어 추가
// addWord 함수를 모달을 사용하도록 수정
function addWord() {
    document.getElementById('add-word-modal').style.display = 'block';
    document.getElementById('new-word-input').focus();
    
    // 엔터키로도 추가 가능
    document.getElementById('new-word-input').onkeypress = function(e) {
        if (e.key === 'Enter') {
            confirmAddWord();
        }
    };
}

// 새로운 함수들 추가
function confirmAddWord() {
    const input = document.getElementById('new-word-input');
    const text = input.value.trim();
    
    if (!text) {
        alert('단어를 입력해주세요!');
        return;
    }
    
    const result = storage.addWord(text);
    
    if (result.success) {
        closeAddWordModal();
        // 현재 화면 새로고침
        const currentScreen = document.querySelector('.screen.active').id;
        showScreen(currentScreen);
        
        // 추가된 단어 바로 재생
        setTimeout(() => {
            speak(result.word.text, result.word.id);
        }, 100);
    } else {
        // 중복 단어 처리
        closeAddWordModal();
        speak(result.word.text, result.word.id);
        
        // 해당 단어로 스크롤
        setTimeout(() => {
            const wordItems = document.querySelectorAll('.word-item');
            wordItems.forEach(item => {
                if (item.querySelector('span').textContent === result.word.text) {
                    item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
        }, 100);
    }
}

function closeAddWordModal() {
    document.getElementById('add-word-modal').style.display = 'none';
    document.getElementById('new-word-input').value = '';
}

// 모달 외부 클릭 시 닫기
document.getElementById('add-word-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeAddWordModal();
    }
});


// 정렬 순서 변경
function changeSortOrder(sortBy) {
    currentSortOrder = sortBy;
    
    // 버튼 활성화 상태 변경
    document.getElementById('sort-alpha').classList.toggle('active', sortBy === 'alphabet');
    document.getElementById('sort-freq').classList.toggle('active', sortBy === 'frequency');
    
    // 단어 목록 새로고침
    displayWords('all-words-list', storage.getSortedWords(currentSortOrder));
}

function changeFontSize(size, event) {
    document.body.classList.remove('font-normal', 'font-large', 'font-xlarge');
    document.body.classList.add(`font-${size}`);
    storage.updateSettings({ fontSize: size });
    
    if (!event || !event.target) return;
    
    const buttons = event.target.parentElement.querySelectorAll('button');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

// '재생 중...' 텍스트가 나오지 않도록 수정된 함수
function changeSpeechRate(rate, event) {
    const rates = { 'normal': 1.0, 'slow': 0.85, 'verySlow': 0.75 };
    speechRate = rates[rate];
    storage.updateSettings({ speechRate: rate });

    // 시각적 피드백 업데이트 (색상 변경)
    const clickedButton = event.target;
    const buttons = clickedButton.parentElement.querySelectorAll('button');
    buttons.forEach(btn => btn.classList.remove('active'));
    clickedButton.classList.add('active');

    // 샘플 음성 재생 (버튼 텍스트 변경 없음)
    speak('안녕하세요');
}

function highlightCurrentSettings() {
    const settings = storage.getSettings();
    const settingsDivs = document.querySelectorAll('#settings-screen > div > div');

    settingsDivs.forEach(div => {
        const h3 = div.querySelector('h3');
        if (!h3) return;
        
        const buttons = div.querySelectorAll('button');
        buttons.forEach(btn => btn.classList.remove('active'));

        let activeBtn;
        if (h3.textContent === '글자 크기') {
            const sizeMap = { 'normal': '보통', 'large': '크게', 'xlarge': '아주 크게' };
            activeBtn = Array.from(buttons).find(b => b.textContent === sizeMap[settings.fontSize]);
        } else if (h3.textContent === '말하기 속도') {
            if (settings.speechRate === 'normal') activeBtn = Array.from(buttons).find(b => b.onclick.toString().includes("'normal'"));
            if (settings.speechRate === 'slow') activeBtn = Array.from(buttons).find(b => b.onclick.toString().includes("'slow'"));
            if (settings.speechRate === 'verySlow') activeBtn = Array.from(buttons).find(b => b.onclick.toString().includes("'verySlow'"));
        } else if (h3.textContent === '음성 선택') {
            const genderMap = { 'female': '여성 음성', 'male': '남성 음성' };
            activeBtn = Array.from(buttons).find(b => b.textContent === genderMap[settings.voiceGender]);
        }
        
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    });
}

function changeVoiceGender(gender, event) {
    voiceGender = gender;
    storage.updateSettings({ voiceGender: gender });
    selectVoiceByGender(gender);
    
    if (event && event.target) {
        const buttons = event.target.parentElement.querySelectorAll('button');
        buttons.forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
    }
    
    speak('안녕하세요');
}

// 설정 적용
function applySettings() {
    const settings = storage.getSettings();
    
    // 글자 크기
    document.body.className = `font-${settings.fontSize}`;
    
    // 말하기 속도
    const rates = {
        'normal': 1.0,
        'slow': 0.85,
        'verySlow': 0.75
    };
    speechRate = rates[settings.speechRate] || 0.85;
    
    // 음성 성별 (추가)
    voiceGender = settings.voiceGender || 'female';
    selectVoiceByGender(voiceGender);
}


// 편집 모드 토글
function toggleEditMode() {
    isEditMode = !isEditMode;
    document.getElementById('edit-mode-btn').textContent = isEditMode ? '✓' : '✏️';
    document.getElementById('all-words-list').classList.toggle('edit-mode', isEditMode);
    
    // 단어 목록 다시 표시
    displayWords('all-words-list', storage.getSortedWords(currentSortOrder));
}

// displayWords 함수 수정 (삭제 버튼 추가)
function displayWords(containerId, words) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    words.forEach(word => {
        const wordItem = document.createElement('div');
        wordItem.className = 'word-item';
        
        // 편집 모드가 아닐 때는 기존과 동일
        if (!isEditMode || containerId !== 'all-words-list') {
            wordItem.onclick = function(e) {
                if (!e.target.classList.contains('favorite-btn')) {
                    speak(word.text, word.id);
                }
            };
            
            wordItem.innerHTML = `
                <span class="word-text">${word.text}</span>
                <button class="favorite-btn" onclick="toggleFavorite(${word.id}, event)">
                    ${word.isFavorite ? '⭐' : '☆'}
                </button>
            `;
        } else {
            // 편집 모드일 때는 삭제 버튼 표시
            wordItem.innerHTML = `
                <span class="word-text">${word.text}</span>
                <button class="delete-btn" onclick="deleteWord(${word.id})">🗑️</button>
            `;
        }
        
        container.appendChild(wordItem);
    });
}

// 단어 삭제 함수 추가
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
