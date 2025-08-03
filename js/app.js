// 전역 변수
const SPEECH_RATES = { 'normal': 1.0, 'slow': 0.5, 'verySlow': 0.1 };
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
let previousScreen = 'home-screen';
let previousPracticeMode = '';
let currentHelpAudioBtn = null;
let audioInitialized = false;


function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

/* 음성 재생 권한 초기화 함수 */
function initializeAudio() {
    if (!isIOS()) {
        // 안드로이드: 기존 로직 완전 보존
        if (!audioInitialized) {
            const utterance = new SpeechSynthesisUtterance('');
            utterance.volume = 0;
            window.speechSynthesis.speak(utterance);
            audioInitialized = true;
        }
    } else {
        // iOS: 새로운 로직
        if (!audioInitialized) {
            try {
                const utterance = new SpeechSynthesisUtterance('');
                utterance.volume = 0;
                window.speechSynthesis.speak(utterance);
                audioInitialized = true;
                console.log('iOS TTS 사용자 상호작용 초기화 완료');
            } catch (error) {
                console.error('iOS TTS 초기화 실패:', error);
            }
        }
    }
}


function initializeVoices() {
    try {
        if (isIOS()) {
            // iOS 전용 초기화
            window.speechSynthesis.cancel();
            const voices = window.speechSynthesis.getVoices();
            
            if (voices.length > 0) {
                console.log('iOS 음성 로드 완료:', voices.length, '개');
                selectVoiceByGender(voiceGender); // 수정됨
            } else {
                if (window.speechSynthesis.onvoiceschanged !== undefined) {
                    window.speechSynthesis.onvoiceschanged = () => {
                        const loadedVoices = window.speechSynthesis.getVoices();
                        if (loadedVoices.length > 0) {
                            selectVoiceByGender(voiceGender); // 수정됨
                            console.log('iOS 음성 지연 로드 완료:', loadedVoices.length, '개');
                            window.speechSynthesis.onvoiceschanged = null;
                        }
                    };
                }
                window.speechSynthesis.getVoices();
            }
        } else {
            // 기존 안드로이드/기타 초기화 방식 유지
            if (window.speechSynthesis.onvoiceschanged !== undefined) {
                window.speechSynthesis.onvoiceschanged = loadVoices;
            }
            loadVoices();
        }
    } catch (error) {
        console.error('음성 초기화 오류:', error);
    }
}

function loadVoices() {
    try {
        voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            selectVoiceByGender(voiceGender); // 수정됨
            console.log('음성 로드 완료:', voices.length, '개');
        }
    } catch (error) {
        console.error('음성 로드 오류:', error);
    }
}

function selectVoiceByGender(gender) {
    try {
        const allVoices = window.speechSynthesis.getVoices();
        if (allVoices.length === 0) {
            console.log('사용 가능한 음성이 없습니다.');
            return;
        }
        
        console.log('=== 사용 가능한 모든 음성 ===');
        allVoices.forEach((voice, index) => {
            console.log(`${index}: ${voice.name} (${voice.lang})`);
        });
        
        let selectedVoice = null;
        
        // 한국어 음성 찾기
        const koreanVoices = allVoices.filter(voice => {
            const lang = voice.lang.toLowerCase();
            const name = voice.name.toLowerCase();
            return lang.includes('ko') || 
                   lang.includes('korean') || 
                   name.includes('korean') ||
                   name.includes('한국');
        });
        
        console.log('=== 한국어 음성 목록 ===');
        koreanVoices.forEach((voice, index) => {
            console.log(`${index}: ${voice.name} (${voice.lang})`);
        });
        
        if (koreanVoices.length > 0) {
            if (gender === 'female') {
                // 기존 여성 음성 찾기 로직 그대로 유지
                selectedVoice = koreanVoices.find(voice => {
                    const name = voice.name.toLowerCase();
                    return name.includes('female') || 
                           name.includes('여성') || 
                           name.includes('woman') ||
                           // 기존 영문 패턴
                           name.includes('yuna') || 
                           name.includes('sora') ||
                           name.includes('heami') ||
                           name.includes('seoyeon') ||
                           name.includes('kyuri') ||
                           // iOS 한글 패턴
                           name.includes('유나') ||
                           name.includes('소라') ||
                           name.includes('해미') ||
                           name.includes('서연') ||
                           name.includes('규리') ||
                           // 기타 패턴
                           name.includes('nanum') ||
                           name.includes('기본 여성');
                });
                
                if (!selectedVoice) {
                    selectedVoice = koreanVoices[0];
                    console.log('여성 음성을 찾지 못해 첫 번째 한국어 음성 사용');
                }
            } else { // male
                // 기존 남성 음성 찾기 로직 그대로 유지
                selectedVoice = koreanVoices.find(voice => {
                    const name = voice.name.toLowerCase();
                    return name.includes('male') || 
                           name.includes('남성') || 
                           name.includes('man') ||
                           // 기존 영문 패턴
                           name.includes('minsu') || 
                           name.includes('jinho') ||
                           name.includes('inho') ||
                           name.includes('woosik') ||
                           // iOS 한글 패턴
                           name.includes('민수') ||
                           name.includes('진호') ||
                           name.includes('인호') ||
                           name.includes('우식') ||
                           // 기타 패턴
                           name.includes('기본 남성');
                });
                
                if (!selectedVoice) {
                    if (koreanVoices.length > 1) {
                        selectedVoice = koreanVoices[1];
                        console.log('남성 음성을 찾지 못해 두 번째 한국어 음성 사용');
                    } else {
                        selectedVoice = koreanVoices[0];
                        console.log('남성 음성을 찾지 못해 첫 번째 한국어 음성 사용');
                    }
                }
            }
        } else {
            // 한국어 음성이 없으면 기본 음성 사용
            selectedVoice = allVoices[0];
            console.log('한국어 음성을 찾을 수 없어 기본 음성 사용:', selectedVoice?.name);
        }
        
        if (selectedVoice) {
            selectedVoiceIndex = allVoices.indexOf(selectedVoice);
            
            // 로그 메시지도 버튼 표시에 맞게 변경
            const displayType = gender === 'female' ? '첫 번째 음성' : '두 번째 음성';
            console.log(`=== 최종 선택된 ${displayType} (내부: ${gender}) ===`);
            console.log(`이름: ${selectedVoice.name}`);
            console.log(`언어: ${selectedVoice.lang}`);
            console.log(`인덱스: ${selectedVoiceIndex}`);
            console.log(`플랫폼: ${isIOS() ? 'iOS' : 'Android/Other'}`);
        } else {
            console.error('음성 선택 실패');
            selectedVoiceIndex = 0;
        }
    } catch (error) {
        console.error('음성 선택 오류:', error);
        selectedVoiceIndex = 0;
    }
}


function changeVoiceGender(gender) {
    try {
        // 버튼 표시에 맞는 로그 메시지
        const displayType = gender === 'female' ? '첫 번째 음성' : '두 번째 음성';
        console.log(`${isIOS() ? 'iOS' : 'Android'} 환경에서 ${displayType}으로 변경 시도 (내부: ${gender})`);
        
        storage.updateSettings({ voiceGender: gender }); // 내부 저장은 기존 방식 유지
        voiceGender = gender; // 전역 변수도 기존 방식 유지
        selectVoiceByGender(gender); // 기존 함수 호출
        highlightCurrentSettings();
        
        // 테스트 메시지를 '안녕하세요'로 통일
        speak('안녕하세요');
    } catch (error) {
        console.error('음성 선택 변경 오류:', error);
    }
}

function speak(text, wordId) {
    try {
        // iOS 첫 실행 시 사용자 상호작용으로 초기화
        if (isIOS() && !audioInitialized) {
            initializeAudio();
        }
        
        if (wordId) storage.incrementUseCount(wordId);
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = speechRate;
        
        // iOS 전용 추가 설정
        if (isIOS()) {
            utterance.volume = 1.0;
            utterance.pitch = 1.0;
        }
        
        const allVoices = window.speechSynthesis.getVoices();
        if (allVoices.length > 0 && selectedVoiceIndex !== -1 && allVoices[selectedVoiceIndex]) {
            utterance.voice = allVoices[selectedVoiceIndex];
            console.log('사용 중인 음성:', allVoices[selectedVoiceIndex].name);
        }
        
        utterance.onstart = () => {
            if (currentPlayingItem) currentPlayingItem.classList.remove('playing');
            const item = Array.from(document.querySelectorAll('.word-item')).find(el => 
                el.querySelector('.word-text')?.textContent === text
            );
            if (item) { 
                item.classList.add('playing'); 
                currentPlayingItem = item; 
            }
        };
        
        utterance.onend = () => {
            if (currentPlayingItem) currentPlayingItem.classList.remove('playing');
            currentPlayingItem = null;
        };
        
        utterance.onerror = (event) => {
            console.error('음성 재생 오류:', event.error);
            if (currentPlayingItem) currentPlayingItem.classList.remove('playing');
            currentPlayingItem = null;
            
            if (event.error === 'network') {
                console.log('네트워크 오류로 인한 음성 재생 실패');
            }
            if (!audioInitialized && isIOS()) {
                alert('음성 재생을 위해 화면을 한 번 터치해주세요.');
            }
        };
        
        // iOS에서만 약간의 지연, 안드로이드는 기존 방식 유지
        if (isIOS()) {
            setTimeout(() => {
                window.speechSynthesis.speak(utterance);
            }, 10);
        } else {
            window.speechSynthesis.speak(utterance);
        }
        
    } catch (error) {
        console.error('음성 출력 오류:', error);
        if (isIOS()) {
            alert('iOS에서 음성 재생 중 오류가 발생했습니다.');
        } else {
            alert('음성 재생이 지원되지 않는 브라우저입니다. Chrome 브라우저를 사용해주세요.');
        }
    }
}

function startApp() {
    try {
        // 기존 안드로이드 동작 완전 보존
        if (!isIOS()) {
            // 안드로이드에서는 기존 방식 그대로
            initializeAudio();
        } else {
            // iOS에서만 새로운 방식
            initializeAudio();
        }
        
        document.getElementById('splash-screen').classList.remove('active');
        showScreen('home-screen');
    } catch (error) {
        console.error('앱 시작 오류:', error);
        location.reload();
    }
}


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
        
        
    } catch (error) {
        console.error('앱 초기화 중 오류:', error);
    }
};


function showScreen(screenId, practiceMode = null) {
    try {
        /* 도움말 화면을 벗어날 때 음성 중단 */
        if (document.querySelector('.screen.active')?.id === 'help-screen' && screenId !== 'help-screen') {
            stopHelpAudio();
        }
        
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
                targetWordDisplay.textContent = '단어 보기';
                targetWordDisplay.classList.add('hidden');
            }
            if (practiceCard) practiceCard.classList.add('clickable');
            if (cardLabel) cardLabel.textContent = '목표 단어';
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
            targetWordDisplay.textContent = '단어 보기';
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
            else if (key === '음성 선택') settingKey = 'voiceGender'; // 수정됨
            
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
        voiceGender = settings.voiceGender || 'female'; // 수정됨
        selectVoiceByGender(voiceGender); // 수정됨
    } catch (error) {
        console.error('설정 적용 오류:', error);
    }
}

function importWords(event) {
    try {
        const file = event.target.files[0];
        if (!file) return;

        const allowedExtensions = ['.csv', '.txt'];
        const fileName = file.name.toLowerCase();
        // 파일 확장자 부분을 좀 더 안전하게 수정합니다.
        const fileExtension = fileName.slice(fileName.lastIndexOf('.'));

        if (!allowedExtensions.includes(fileExtension)) {
            alert('CSV 또는 TXT 파일만 불러올 수 있습니다. 음성 파일 등 다른 형식은 지원하지 않습니다.');
            event.target.value = ''; // 잘못된 파일 선택 시 입력 초기화
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            const lines = text.split('\n').map(line => line.trim()).filter(line => line);
            let addedCount = 0;
            lines.forEach(line => {
                // BOM 문자가 있을 경우 제거하여 단어가 깨지는 것을 방지합니다.
                const cleanLine = line.replace(/^\uFEFF/, '');
                if (cleanLine && storage.addWord(cleanLine).success) {
                    addedCount++;
                }
            });
            alert(`${addedCount}개의 새 단어를 추가했습니다.`);
            changeSortOrder(currentSortOrder);
        };

        reader.onerror = function() {
            alert('파일을 읽는 중 오류가 발생했습니다.');
        };
        
        // 바로 이 부분이 핵심입니다. 인코딩 방식을 'UTF-8'로 명시합니다.
        reader.readAsText(file, 'UTF-8');

    } catch (error) {
        console.error('단어 가져오기 오류:', error);
        alert('파일을 읽는 중 오류가 발생했습니다.');
    } finally {
        event.target.value = '';
    }
}

function exportWords() {
    try {
        const csv = storage.getAllWords().map(w => w.text).join('\n');
        // CSV 데이터 앞에 BOM(\uFEFF)을 추가합니다.
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
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


/* 설정 화면으로 이동하면서 이전 화면 기억 */
function goToSettings(fromScreen) {
    try {
        /* 도움말 화면에서 나갈 때 음성 중단 */
        if (fromScreen === 'help-screen') {
            stopHelpAudio();
        }
        
        previousScreen = fromScreen;
        if (fromScreen === 'practice-list-screen') {
            previousPracticeMode = currentPracticeMode;
        }
        showScreen('settings-screen');
    } catch (error) {
        console.error('설정 이동 오류:', error);
    }
}

/* 설정 화면에서 이전 화면으로 돌아가기 */
function returnToPreviousScreen() {
    try {
        if (previousScreen === 'practice-list-screen' && previousPracticeMode) {
            showScreen(previousScreen, previousPracticeMode);
        } else {
            showScreen(previousScreen);
        }
    } catch (error) {
        console.error('이전 화면 복귀 오류:', error);
        showScreen('home-screen'); /* 오류 시 홈으로 */
    }
}

/* 도움말 음성 중단 함수 */
function stopHelpAudio() {
    if (currentHelpAudioBtn) {
        window.speechSynthesis.cancel();
        currentHelpAudioBtn.classList.remove('playing');
        currentHelpAudioBtn = null;
    }
}


/* 화면의 실제 텍스트를 그대로 읽어주는 함수 (이모티콘 제거 + 토글 기능) */
function speakHelpSectionDirect() {
    try {
        /* 현재 버튼 찾기 */
        const currentBtn = event.target;
        
        /* 이미 재생 중인 버튼을 다시 누른 경우 음성 중단 */
        if (currentHelpAudioBtn === currentBtn) {
            window.speechSynthesis.cancel();
            currentBtn.classList.remove('playing');
            currentHelpAudioBtn = null;
            return;
        }
        
        /* 이전 음성 중지 */
        window.speechSynthesis.cancel();
        
        /* 이전 버튼 상태 초기화 */
        if (currentHelpAudioBtn) {
            currentHelpAudioBtn.classList.remove('playing');
        }
        
        /* 현재 버튼을 재생 중으로 설정 */
        currentHelpAudioBtn = currentBtn;
        
        /* 해당 섹션의 실제 텍스트 추출 */
        const section = currentBtn.closest('.help-section');
        if (!section) return;
        
        /* 텍스트 내용 추출 (HTML 태그 제거) */
        let text = '';
        
        /* 제목 추가 (이모티콘을 텍스트로 변환) */
        const title = section.querySelector('h3');
        if (title) {
            const titleText = convertEmojiToText(title.textContent);
            text += titleText + '. ';
        }
        
        /* 모든 p, h4, li 태그의 텍스트 추출 (이모티콘을 텍스트로 변환) */
        const textElements = section.querySelectorAll('p, h4, li');
        textElements.forEach(element => {
            const elementText = convertEmojiToText(element.textContent.trim());
            if (elementText) {
                text += elementText + '. ';
            }
        });
        
        /* 불필요한 기호들 정리 */
        text = text.replace(/•/g, '').replace(/\s+/g, ' ').trim();
        
        if (!text) {
            console.error('읽을 텍스트가 없습니다.');
            currentHelpAudioBtn = null;
            return;
        }
        
        /* 음성 합성 객체 생성 */
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = speechRate;
        
        /* 음성 설정 적용 */
        const allVoices = window.speechSynthesis.getVoices();
        if (allVoices.length > 0 && selectedVoiceIndex !== -1 && allVoices[selectedVoiceIndex]) {
            utterance.voice = allVoices[selectedVoiceIndex];
        }
        
        /* 재생 시작 이벤트 */
        utterance.onstart = () => {
            currentBtn.classList.add('playing');
        };
        
        /* 재생 완료 이벤트 */
        utterance.onend = () => {
            currentBtn.classList.remove('playing');
            currentHelpAudioBtn = null;
        };
        
        /* 재생 오류 이벤트 */
        utterance.onerror = (event) => {
            console.error('음성 재생 오류:', event.error);
            currentBtn.classList.remove('playing');
            currentHelpAudioBtn = null;
        };
        
        /* 음성 재생 시작 */
        window.speechSynthesis.speak(utterance);
        
    } catch (error) {
        console.error('도움말 음성 재생 오류:', error);
        if (currentHelpAudioBtn) {
            currentHelpAudioBtn.classList.remove('playing');
            currentHelpAudioBtn = null;
        }
    }
}
/* 특정 이모티콘을 텍스트로 변환하는 함수 */
function convertEmojiToText(text) {
    const emojiMap = {
        '🎤': '마이크',
        '✏️': '연필',
        '🗑️': '휴지통',
        '⭐': '별표',
        '☆': '빈별표',
        '🔊': ' ',
        '➕': '플러스',
        '🗣️': ' ',
        '📖': ' ',
        '🎙️': ' ',
        '❓': ' ',
        '⚙️': '설정',
        '💡': ' ',
        '🆘': ' ',
        '📞': ' ',
        '🏠': ' ',
        '←': ' ',
        '✓': '체크'
    };
    
    let result = text;
    
    /* 이모티콘 맵의 각 항목을 텍스트로 변환 */
    for (const [emoji, word] of Object.entries(emojiMap)) {
        /* 정규식 특수문자 이스케이프 처리 */
        const escapedEmoji = emoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        result = result.replace(new RegExp(escapedEmoji, 'g'), word);
    }
    
    /* + 기호는 별도로 처리 */
    result = result.replace(/\+/g, '플러스');
    
    /* 불릿 포인트 제거 */
    result = result.replace(/•/g, '');
    
    /* 나머지 불필요한 이모티콘들은 제거 */
    result = result.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
    
    return result.trim();
}

/* 설정 화면에서 뒤로가기 - 홈에서 온 경우와 다른 화면에서 온 경우 구분 */
function goBackFromSettings() {
    try {
        /* 홈 화면에서 설정으로 온 경우 홈으로, 다른 화면에서 온 경우 이전 화면으로 */
        if (previousScreen && previousScreen !== 'home-screen') {
            if (previousScreen === 'practice-list-screen' && previousPracticeMode) {
                showScreen(previousScreen, previousPracticeMode);
            } else {
                showScreen(previousScreen);
            }
        } else {
            showScreen('home-screen');
        }
        
        /* previousScreen 초기화 */
        previousScreen = 'home-screen';
        previousPracticeMode = '';
    } catch (error) {
        console.error('설정 화면 뒤로가기 오류:', error);
        showScreen('home-screen'); /* 오류 시 홈으로 */
    }
}
