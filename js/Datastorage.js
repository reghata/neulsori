// 데이터 저장/관리를 담당하는 모듈
class DataStorage {
    constructor() {
        this.data = this.loadData();
    }
    
    // 데이터 불러오기
    loadData() {
        const saved = localStorage.getItem('neulsori_data');
        if (saved) {
            return JSON.parse(saved);
        }
        
        // 초기 데이터 (기본값 수정)
        return {
            words: [
                { id: 1, text: '안녕하세요', isFavorite: false, useCount: 0 },
                { id: 2, text: '감사합니다', isFavorite: false, useCount: 0 },
                { id: 3, text: '도와주세요', isFavorite: true, useCount: 0 },
                { id: 4, text: '네', isFavorite: false, useCount: 0 },
                { id: 5, text: '아니요', isFavorite: false, useCount: 0 }
            ],
            settings: {
                fontSize: 'xlarge',      // '아주 크게'로 변경
                speechRate: 'verySlow',  // '아주 느리게'로 변경
                voiceGender: 'female'
            },
            nextId: 6
        };
    }
    
    // 데이터 저장하기
    saveData() {
        localStorage.setItem('neulsori_data', JSON.stringify(this.data));
    }
    
    // 모든 단어 가져오기
    getAllWords() {
        return this.data.words;
    }
    
    // 즐겨찾기 단어만 가져오기
    getFavoriteWords() {
        return this.data.words.filter(word => word.isFavorite);
    }
    
    // 단어 추가
    addWord(text) {
        // 중복 체크
        const exists = this.data.words.find(w => w.text === text);
        if (exists) {
            return { success: false, word: exists };
        }
        
        const newWord = {
            id: this.data.nextId++,
            text: text,
            isFavorite: false,
            useCount: 0
        };
        
        this.data.words.push(newWord);
        this.saveData();
        
        return { success: true, word: newWord };
    }
    
    // 즐겨찾기 토글
    toggleFavorite(id) {
        const word = this.data.words.find(w => w.id === id);
        if (word) {
            word.isFavorite = !word.isFavorite;
            this.saveData();
        }
    }
    
    // 사용 횟수 증가
    incrementUseCount(id) {
        const word = this.data.words.find(w => w.id === id);
        if (word) {
            word.useCount++;
            this.saveData();
        }
    }
    
    // 정렬된 단어 가져오기
    getSortedWords(sortBy = 'alphabet') {
        const words = [...this.data.words];
        
        if (sortBy === 'alphabet') {
            words.sort((a, b) => a.text.localeCompare(b.text, 'ko'));
        } else if (sortBy === 'frequency') {
            words.sort((a, b) => b.useCount - a.useCount);
        }
        
        return words;
    }
    
    // 설정 가져오기/저장하기
    getSettings() {
        return this.data.settings;
    }
    
    updateSettings(settings) {
        this.data.settings = { ...this.data.settings, ...settings };
        this.saveData();
    }

    // deleteWord 메서드 추가
    deleteWord(id) {
        this.data.words = this.data.words.filter(w => w.id !== id);
        this.saveData();
    }

}
