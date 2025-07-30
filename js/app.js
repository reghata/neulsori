// 전역 변수
let storage;
let currentSortOrder = 'alphabet';
let speechRate = 0.85;  // 기본: 느리게
let currentPlayingItem = null;

// 앱 초기화
window.onload = function() {
    storage = new DataStorage();
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker 등록 성공:', registration);
            })
            .catch(error => {
                console.log('Service Worker 등록 실패:', error);
            });
    }

    // 설정 적용
    applySettings();
    
    // 2초 후 메인 화면으로
    setTimeout(() => {
        showScreen('main-screen');
    }, 2000);
};

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
}

// 단어 목록 표시
function displayWords(containerId, words) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    words.forEach(word => {
        const wordItem = document.createElement('div');
        wordItem.className = 'word-item';
        
        // 전체 word-item에 클릭 이벤트 추가
        wordItem.onclick = function(e) {
            // 즐겨찾기 버튼을 클릭한 경우가 아니면 음성 재생
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
        
        container.appendChild(wordItem);
    });
}

// 음성 재생
function speak(text, wordId) {
    // 사용 횟수 증가
    if (wordId) {
        storage.incrementUseCount(wordId);
    }
    
    // 이전 음성 중지
    window.speechSynthesis.cancel();
    
    // 새 음성 재생
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = speechRate;
    
    // 시각적 피드백
    utterance.onstart = () => {
        // 이전 하이라이트 제거
        if (currentPlayingItem) {
            currentPlayingItem.classList.remove('playing');
        }
        
        // 새 하이라이트 추가
        const wordItems = document.querySelectorAll('.word-item');
        wordItems.forEach(item => {
            if (item.querySelector('span').textContent === text) {
                item.classList.add('playing');
                currentPlayingItem = item;
            }
        });
    };
    
    // utterance.onend 부분 완전히 제거!
    // (아무것도 하지 않음 - 색상 유지)
    
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

// 글자 크기 변경
function changeFontSize(size) {
    // 모든 클래스 제거 후 새로 추가
    document.body.classList.remove('font-normal', 'font-large', 'font-xlarge');
    document.body.classList.add(`font-${size}`);
    
    // 설정 저장
    storage.updateSettings({ fontSize: size });
    
    // 즉시 확인용 로그
    console.log('폰트 크기 변경:', size, document.body.className);
}

// 말하기 속도 변경
function changeSpeechRate(rate) {
    const rates = {
        'normal': 1.0,
        'slow': 0.85,
        'verySlow': 0.75
    };
    speechRate = rates[rate];
    storage.updateSettings({ speechRate: rate });
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
    speechRate = rates[settings.speechRate];
}

// 전역 변수 추가
let isEditMode = false;

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