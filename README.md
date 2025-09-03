# 我的食譜 🍽️

一個簡單的食譜管理網站，讓您輕鬆瀏覽、搜尋和管理個人食譜收藏。

## ✨ 功能特色

### 🏠 首頁瀏覽

- 美觀的食譜卡片展示
- 響應式設計，支援桌面和手機瀏覽
- 清晰的食譜描述和標籤顯示

### 🏷️ 標籤系統

- **智能標籤篩選**：支援多標籤同時選擇
- **AND邏輯搜尋**：選擇多個標籤時，顯示包含所有標籤的食譜
- **一鍵清除**：快速清除所有篩選條件
- **視覺回饋**：選中的標籤有明顯的顏色區別

### 📖 食譜詳細頁面

- **份數調整**：自動調整所有材料用量
- **材料縮放**：修改任一材料用量，其他材料按比例自動調整
- **步驟指導**：清晰的製作步驟
- **重要提醒**：額外的烹飪提示和注意事項

### 🔧 技術功能

- 純前端實現，無需伺服器
- JSON格式儲存食譜資料
- 響應式設計
- 現代化UI介面

## 🚀 快速開始

### 新增食譜

1. 複製`.example.json`為新檔案
2. 命名為`[recipe_name].json`並填寫食譜內容
3. 執行 `update_recipes.py`
4. 刷新網頁即可看到新食譜

## 🎯 使用技巧

### 標籤篩選示例

- 想找**中式下飯菜**：選擇 `中式` + `下飯菜` 標籤
- 想找**雞肉料理**：選擇 `雞肉` 標籤
- 想找**簡單快手菜**：選擇 `簡單` + `快手菜` 標籤

### 份數調整

1. 在食譜詳細頁面，修改「份數」欄位
2. 所有材料用量會自動按比例調整
3. 也可以直接修改某個材料的用量，其他材料會跟著調整

## 🤝 貢獻食譜

歡迎提交新食譜或改進建議！

1. Fork 此專案
2. 創建新分支 (`git checkout -b feature/new-recipe`)
3. 提交變更 (`git commit -am 'Add: 新增某某食譜'`)
4. 推送分支 (`git push origin feature/new-recipe`)
5. 創建Pull Request

## ✨ Who made this?

This project was developed by [Hung Liang](https://github.com/Hung-Liang)

## ☕ Support Me

<a href="https://www.buymeacoffee.com/hungliang" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" height="41" width="174"></a>
