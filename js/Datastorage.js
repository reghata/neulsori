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
        
        // ======================================================
        // ★★★ 기본 단어 목록을 수정하시려면 이 부분을 변경하세요 ★★★
        // ======================================================
        return {
            words: [
                // 예시: 아래 목록을 환자에게 맞게 수정하세요.
                // isFavorite: true 로 설정하면 처음부터 즐겨찾기에 추가됩니다.
                { id: 1, text: '물', isFavorite: true, useCount: 0 },
                { id: 2, text: '화장실', isFavorite: true, useCount: 0 },
                { id: 3, text: '아파요', isFavorite: false, useCount: 0 },
                { id: 4, text: '네', isFavorite: false, useCount: 0 },
                { id: 5, text: '아니요', isFavorite: false, useCount: 0 },
                { id: 6, text: '텔레비전', isFavorite: false, useCount: 0 },
                { id: 7, text: '감사합니다', isFavorite: false, useCount: 0 }
            ],
            settings: {
                fontSize: 'normal',
                speechRate: 'normal',
                voiceSelection: 'first'
            },
            nextId: 8 // ★★★ 단어 개수에 맞춰 이 숫자도 변경해주세요 (마지막 id + 1) ★★★
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
    
    getFavoriteWords() {
        return this.data.words.filter(word => word.isFavorite);
    }
    
    addWord(text) {
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

    updateWord(id, newText) {
        const word = this.data.words.find(w => w.id === id);
        if (word) {
            word.text = newText;
            this.saveData();
            return true;
        }
        return false;
    }
    
    toggleFavorite(id) {
        const word = this.data.words.find(w => w.id === id);
        if (word) {
            word.isFavorite = !word.isFavorite;
            this.saveData();
        }
    }
    
    incrementUseCount(id) {
        const word = this.data.words.find(w => w.id === id);
        if (word) {
            word.useCount++;
            this.saveData();
        }
    }
    
    getSortedWords(sortBy = 'alphabet') {
        const words = [...this.data.words];
        if (sortBy === 'alphabet') {
            words.sort((a, b) => a.text.localeCompare(b.text, 'ko'));
        } else if (sortBy === 'frequency') {
            words.sort((a, b) => b.useCount - a.useCount);
        }
        return words;
    }
    
    getSettings() {
        return this.data.settings;
    }
    
    updateSettings(settings) {
        this.data.settings = { ...this.data.settings, ...settings };
        this.saveData();
    }

    deleteWord(id) {
        this.data.words = this.data.words.filter(w => w.id !== id);
        this.saveData();
    }
}
