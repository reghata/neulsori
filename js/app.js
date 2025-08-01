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
let practiceWord = { text: '', id: null, isVisible: false };
let currentPracticeMode = '';
let recognition;
let currentEditingWordId = null;

window.onload = function() {
    try {
        storage = new DataStorage();
        applySettings();
        setupSpeechRecognition();
        
        // 서비스 워커 등록
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./service-worker.js').catch(err => {
                console.log('Service Worker 등록 실패:', err);
            });
        }
        
        // 음성 초기화
        initializeVoices();
        
        // 모달 이벤트 리스너
        document.getElementById('cancel-word-btn').onclick = closeWordModal;
        document.getElementById('confirm-word-btn').onclick = confirmWordAction;
        
        // 연습 화면 카드 클릭 이벤트
        const practiceCard = document.getElementById('practice-word-card');
        if (practiceCard) {
            practiceCard.onclick = toggleTargetWord;
        }
        
        // 버전 정보 클릭 이벤트
        const versionInfo = document.getElementById('version-info');
        if(versionInfo) {
            versionInfo.addEventListener('click', handleVersionClick);
        }
        
        // 2초 후 홈 화면으로 이동
        setTimeout(() => {
            document.getElementById('splash-screen').classList.remove('active');
            showScreen('home-screen');
        }, 2000);
        
    } catch (error) {
        console.error('앱 초기화 중 오류:', error);
        // 오류가 발생해도 홈 화면으로 이동
        setTimeout(() => {
            document.getElementById('splash-screen').classList.remove('active');
            showScreen('home-screen');
        }, 1000);
    }
};

// 음성 초기화 함수
function initializeVoices() {
    try {
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
        loadVoices();
    } catch (error) {
        console.error('음성 초기화 오류:', error);
    }
}

// 음성 목록 로드
function loadVoices() {
    try {
        voices = window.speechSynthesis.getVoices();
        selectVoiceByGender(voiceGender);
    } catch (error) {
        console.error('음성 로드 오류:', error);
    }
}

// 성별에 따른 음성 선택
function selectVoiceByGender(gender) {
    try {
        const allVoices = window.speechSynthesis.getVoices();
        if (allVoices.length === 0) return;
        
        let selectedVoice = null;
        
        // 한국어 음성 찾기
        const koreanVoices = allVoices.filter(voice => voice.lang.includes('ko'));
        
        if (koreanVoices.length > 0) {
            if (gender === 'female') {
                selectedVoice = koreanVoices.find(voice => 
                    voice.name.includes('Female') || voice.name.includes('여성') || 
                    voice.name.includes('Yuna') || voice.name.includes('Sora')
                ) || koreanVoices[0];
            } else {
                selectedVoice = koreanVoices.find(voice => 
                    voice.name.includes('Male') || voice.name.includes('남성') || 
                    voice.name.includes('Minsu') || voice.name.includes('Jinho')
                ) || koreanVoices[0];
            }
        } else {
            // 한국어 음성이 없으면 첫 번째 음성 사용
            selectedVoice = allVoices[0];
        }
        
        if (selectedVoice) {
            selectedVoiceIndex = allVoices.indexOf(selectedVoice);
        }
    } catch (error) {
        console.error('음성 선택 오류:', error);
        selectedVoiceIndex = 0;
    }
}

function showScreen(screenId, practiceMode = null) {
    try {
        if (isEditMode && screenId !== 'conversation-screen') {
            toggleEditMode(false);
        }
        window.scrollTo(0, 0);
        document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }

        if (screenId === 'conversation-screen') {
            changeSortOrder(currentSortOrder);
        } else if (screenId === 'practice-list-screen') {
            if (practiceMode !== null) currentPracticeMode = practiceMode;
            const titleElement = document.getElementById('practice-list-title');
            if (titleElement) {
                titleElement.textContent = currentPracticeMode === 'reading' ? '읽기 연습' : '따라말하기 연습';
            }
            displayWords('practice-word-list-container', storage.getSortedWords('alphabet'));
        } else if (screenId === 'settings-screen') {
            highlightCurrentSettings();
        } else if (screenId === 'therapist-screen') {
            showStats();
        }
    } catch (error) {
        console.error('화면 전환 오류:', error);
    }
}

function displayWords(containerId, words) {
    try {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        words.forEach(word => {
            const wordItem = document.createElement('div');
            wordItem.className = 'word-item';
            
            if (containerId === 'word-list-container') {
                if (!isEditMode) {
                    wordItem.onclick = () => speak(word.text, word.id);
                    wordItem.innerHTML = `<span class="word-text">${word.text}</span><button class="favorite-btn" onclick="toggleFavorite(${word.id}, event)">${word.isFavorite ? '⭐' : '☆'}</button>`;
                } else {
                    wordItem.innerHTML = `
                        <span class="word-text">${word.text}</span>
                        <div class="edit-item-icons">
                            <button onclick="openWordModal(true, {id: ${word.id}, text: '${word.text}'}, event)">✏️</button>
                            <button class="delete-btn" onclick="deleteWord(${word.id}, event)">🗑️</button>
                        </div>`;
                }
            } else if (containerId === 'practice-word-list-container') {
                wordItem.onclick = () => startPractice(word);
                wordItem.innerHTML = `<span class="word-text">${word.text}</span>`;
            }
            container.appendChild(wordItem);
        });
    } catch (error) {
        console.error('단어 표시 오류:', error);
    }
}

function startPractice(word) {
    try {
        practiceWord = { ...word, isVisible: false };
        
        const targetWordDisplay = document.getElementById('target-word-display');
        const practiceCard = document.getElementById('practice-word-card');
        const cardLabel = document.getElementById('practice-card-label');
        const listenButtonContainer = document.getElementById('listen-button-container');
        const practiceTitle = document.getElementById('practice-title');

        // 초기화
        const recognizedText = document.getElementById('recognized-text-display');
        const similarityScore = document.getElementById('similarity-score-display');
        const micStatus = document.getElementById('mic-status');
        
        if (recognizedText) recognizedText.textContent = '-';
        if (similarityScore) similarityScore.textContent = '0%';
        if (micStatus) micStatus.textContent = '버튼을 누르고 말씀하세요';

        if (currentPracticeMode === 'shadowing') {
            if (practiceTitle) practiceTitle.textContent = '따라말하기 연습';
            if (listenButtonContainer) listenButtonContainer.style.display = 'block';
            if (targetWordDisplay) {
                targetWordDisplay.textContent = '탭하여 단어 보기';
                targetWordDisplay.classList.add('hidden');
            }
            if (practiceCard) practiceCard.classList.add('clickable');
            if (cardLabel) cardLabel.textContent = '목표 단어 (탭하여 보기/숨기기)';
        } else { 
            if (practiceTitle) practiceTitle.textContent = '읽기 연습';
            if (listenButtonContainer) listenButtonContainer.style.display = 'none';
            if (targetWordDisplay) {
                targetWordDisplay.textContent = practiceWord.text;
                targetWordDisplay.classList.remove('hidden');
            }
            if (practiceCard) practiceCard.classList.remove('clickable');
            if (cardLabel) cardLabel.textContent = '목표 단어';
        }
        showScreen('practice-screen');
    } catch (error) {
        console.error('연습 시작 오류:', error);
    }
}

function toggleTargetWord() {
    try {
        if (currentPracticeMode !== 'shadowing') return;

        practiceWord.isVisible = !practiceWord.isVisible;
        const targetWordDisplay = document.getElementById('target-word-display');
        if (!targetWordDisplay) return;
        
        if (practiceWord.isVisible) {
            targetWordDisplay.textContent = practiceWord.text;
            targetWordDisplay.classList.remove('hidden');
        } else {
            targetWordDisplay.textContent = '탭하여 단어 보기';
            targetWordDisplay.classList.add('hidden');
        }
    } catch (error) {
        console.error('단어 토글 오류:', error);
    }
}

function openWordModal(isEditing = false, word = null, event) {
    try {
        if (event) event.stopPropagation();
        
        const modal = document.getElementById('word-modal');
        const title = document.getElementById('modal-title');
        const input = document.getElementById('word-input');
        const confirmBtn = document.getElementById('confirm-word-btn');

        if (!modal || !title || !input || !confirmBtn) return;

        if (isEditing) {
            title.textContent = '단어 편집';
            input.value = word.text;
            confirmBtn.textContent = '수정';
            currentEditingWordId = word.id;
        } else {
            title.textContent = '새 단어 추가';
            input.value = '';
            confirmBtn.textContent = '추가';
            currentEditingWordId = null;
        }
        modal.style.display = 'flex';
        input.focus();
    } catch (error) {
        console.error('모달 열기 오류:', error);
    }
}

function closeWordModal() {
    try {
        const modal = document.getElementById('word-modal');
        if (modal) modal.style.display = 'none';
    } catch (error) {
        console.error('모달 닫기 오류:', error);
    }
}

function confirmWordAction() {
    try {
        const input = document.getElementById('word-input');
        if (!input) return;
        
        const text = input.value.trim();
        if (!text) return alert('단어를 입력해주세요!');

        if (currentEditingWordId !== null) {
            storage.updateWord(currentEditingWordId, text);
        } else {
            storage.addWord(text);
        }
        
        closeWordModal();
        
        const activeScreen = document.querySelector('.screen.active');
        if (activeScreen) {
            const activeScreenId = activeScreen.id;
            if (activeScreenId === 'conversation-screen') {
                changeSortOrder(currentSortOrder);
            } else if (activeScreenId === 'practice-list-screen') {
                showScreen('practice-list-screen', currentPracticeMode);
            }
        }
    } catch (error) {
        console.error('단어 확인 오류:', error);
    }
}

function deleteWord(wordId, event) {
    try {
        if (event) event.stopPropagation();
        const word = storage.getAllWords().find(w => w.id === wordId);
        if (word && confirm(`"${word.text}"를 삭제하시겠습니까?`)) {
            storage.deleteWord(wordId);
            changeSortOrder(currentSortOrder);
        }
    } catch (error) {
        console.error('단어 삭제 오류:', error);
    }
}

function toggleEditMode(forceState = null) {
    try {
        isEditMode = forceState !== null ? forceState : !isEditMode;
        const editBtn = document.getElementById('edit-mode-btn');
        if (editBtn) {
            editBtn.textContent = isEditMode ? '✓' : '✏️';
        }
        changeSortOrder(currentSortOrder);
    } catch (error) {
        console.error('편집 모드 토글 오류:', error);
    }
}

function setupSpeechRecognition() {
    try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.log('음성 인식이 지원되지 않습니다.');
            return;
        }
        
        recognition = new SpeechRecognition();
        recognition.lang = 'ko-KR';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            const micBtn = document.getElementById('mic-btn');
            const micStatus = document.getElementById('mic-status');
            if (micBtn) micBtn.classList.add('recording');
            if (micStatus) micStatus.textContent = '듣고 있어요...';
        };
        
        recognition.onresult = (event) => {
            const spokenText = event.results[0][0].transcript;
            const recognizedDisplay = document.getElementById('recognized-text-display');
            const similarityDisplay = document.getElementById('similarity-score-display');
            
            if (recognizedDisplay) recognizedDisplay.textContent = spokenText;
            if (similarityDisplay) {
                const similarity = calculateSimilarity(practiceWord.text, spokenText);
                similarityDisplay.textContent = `${similarity.toFixed(0)}%`;
            }
        };

        recognition.onerror = (event) => {
            let errorMessage = '오류가 발생했습니다.';
            if (event.error === 'no-speech') errorMessage = '음성이 감지되지 않았습니다.';
            else if (event.error === 'not-allowed') errorMessage = '마이크 사용 권한을 허용해주세요.';
            
            const micStatus = document.getElementById('mic-status');
            if (micStatus) micStatus.textContent = errorMessage;
        };
        
        recognition.onend = () => {
            const micBtn = document.getElementById('mic-btn');
            const micStatus = document.getElementById('mic-status');
            
            if (micBtn) micBtn.classList.remove('recording');
            if (micStatus && micStatus.textContent === '듣고 있어요...') {
                micStatus.textContent = '버튼을 누르고 다시 시도하세요';
            }
        };
    } catch (error) {
        console.error('음성 인식 설정 오류:', error);
    }
}

function startRecognition() {
    try {
        if (recognition) {
            recognition.start();
        } else {
            const micStatus = document.getElementById('mic-status');
            if (micStatus) micStatus.textContent = '음성 인식을 사용할 수 없습니다.';
        }
    } catch(e) {
        const micStatus = document.getElementById('mic-status');
        if (micStatus) micStatus.textContent = '음성 인식을 시작할 수 없습니다.';
    }
}

function calculateSimilarity(str1, str2) {
    try {
        str1 = str1.replace(/\s/g, '');
        str2 = str2.replace(/\s/g, '');
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        if (longer.length === 0) return 100.0;
        
        const distance = levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length * 100.0;
    } catch (error) {
        console.error('유사도 계산 오류:', error);
        return 0;
    }
}

function levenshteinDistance(a, b) {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    for (let i = 0; i <= a.length; i += 1) { matrix[0][i] = i; }
    for (let j = 0; j <= b.length; j += 1) { matrix[j][0] = j; }
    for (let j = 1; j <= b.length; j += 1) {
        for (let i = 1; i <= a.length; i += 1) {
            const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + indicator);
        }
    }
    return matrix[b.length][a.length];
}

function speak(text, wordId) {
    try {
        if (wordId) storage.incrementUseCount(wordId);
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = speechRate;
        
        const allVoices = window.speechSynthesis.getVoices();
        if (allVoices.length > 0 && selectedVoiceIndex !== -1 && allVoices[selectedVoiceIndex]) {
            utterance.voice = allVoices[selectedVoiceIndex];
        }
        
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
    } catch (error) {
        console.error('음성 출력 오류:', error);
    }
}

function toggleFavorite(wordId, event) {
    try {
        if (event) event.stopPropagation();
        storage.toggleFavorite(wordId);
        changeSortOrder(currentSortOrder);
    } catch (error) {
        console.error('즐겨찾기 토글 오류:', error);
    }
}

function changeSortOrder(sortBy) {
    try {
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
    } catch (error) {
        console.error('정렬 변경 오류:', error);
    }
}

function changeFontSize(size) {
    try {
        document.body.className = `font-${size}`;
        storage.updateSettings({ fontSize: size });
        highlightCurrentSettings();
    } catch (error) {
        console.error('글자 크기 변경 오류:', error);
    }
}

function changeSpeechRate(rate) {
    try {
        speechRate = SPEECH_RATES[rate];
        storage.updateSettings({ speechRate: rate });
        highlightCurrentSettings();
        speak('안녕하세요');
    } catch (error) {
        console.error('말하기 속도 변경 오류:', error);
    }
}

function changeVoiceGender(gender) {
    try {
        storage.updateSettings({ voiceGender: gender });
        voiceGender = gender;
        selectVoiceByGender(gender);
        highlightCurrentSettings();
        speak('안녕하세요');
    } catch (error) {
        console.error('음성 성별 변경 오류:', error);
    }
}

function highlightCurrentSettings() {
    try {
        const settings = storage.getSettings();
        document.querySelectorAll('[data-setting-value]').forEach(btn => {
            const parentDiv = btn.parentElement.parentElement;
            const keyElement = parentDiv.querySelector('h3');
            if (!keyElement) return;
            
            const key = keyElement.textContent;
            let settingKey;
            if (key === '글자 크기') settingKey = 'fontSize';
            else if (key === '말하기 속도') settingKey = 'speechRate';
            else if (key === '음성 선택') settingKey = 'voiceGender';
            
            if (settingKey) {
                btn.classList.toggle('active', btn.dataset.settingValue === settings[settingKey]);
            }
        });
    } catch (error) {
        console.error('설정 하이라이트 오류:', error);
    }
}

function applySettings() {
    try {
        const settings = storage.getSettings();
        document.body.className = `font-${settings.fontSize}`;
        speechRate = SPEECH_RATES[settings.speechRate] || SPEECH_RATES['verySlow'];
        voiceGender = settings.voiceGender || 'female';
        selectVoiceByGender(voiceGender);
    } catch (error) {
        console.error('설정 적용 오류:', error);
    }
}

function importWords(event) {
    try {
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
    } catch (error) {
        console.error('단어 가져오기 오류:', error);
        alert('파일을 읽는 중 오류가 발생했습니다.');
    }
}

function exportWords() {
    try {
        const csv = storage.getAllWords().map(w => w.text).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `늘소리_단어목록_${new Date().toLocaleDateString()}.csv`;
        link.click();
    } catch (error) {
        console.error('단어 내보내기 오류:', error);
        alert('단어 내보내기 중 오류가 발생했습니다.');
    }
}

function resetApp() {
    try {
        if (confirm('모든 데이터가 삭제됩니다. 정말 초기화하시겠습니까?')) {
            if (confirm('정말로 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                localStorage.clear();
                location.reload();
            }
        }
    } catch (error) {
        console.error('앱 초기화 오류:', error);
    }
}

function bulkAddWords() {
    try {
        const textarea = document.getElementById('bulk-words');
        if (!textarea) return;
        
        const words = textarea.value.split('\n').map(w => w.trim()).filter(w => w);
        if (words.length === 0) return;

        let addedCount = 0;
        words.forEach(word => {
            if (storage.addWord(word).success) addedCount++;
        });
        
        const button = document.querySelector('#therapist-screen button[onclick="bulkAddWords()"]');
        if (button) {
            const originalText = button.textContent;
            button.textContent = addedCount > 0 ? `${addedCount}개의 단어가 추가되었습니다.` : '추가할 새 단어가 없습니다.';
            setTimeout(() => { button.textContent = originalText; }, 2000);
        }
        
        textarea.value = '';
        showStats();
    } catch (error) {
        console.error('일괄 단어 추가 오류:', error);
    }
}

function showStats() {
    try {
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
    } catch (error) {
        console.error('통계 표시 오류:', error);
    }
}

function handleVersionClick() {
    try {
        versionTapCount++;
        if (versionTapCount === 1) {
            versionTapTimer = setTimeout(() => { versionTapCount = 0; }, 3000);
        }
        if (versionTapCount === 5) {
            clearTimeout(versionTapTimer);
            versionTapCount = 0;
            showScreen('therapist-screen');
        }
    } catch (error) {
        console.error('버전 클릭 처리 오류:', error);
    }
}