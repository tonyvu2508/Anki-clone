1. Sử dụng **NotebookLM** để tạo flashcards  
   - Chuẩn bị tài liệu nguồn (PDF, docx, trang web...) và nạp vào NotebookLM.  
   - Trong studio chọn Flashcards để tạo nội dung

2. Sử dụng **Chrome + extension AnkiNLM** để tải nội dung flashcards  
   - Cài extension AnkiNLM từ files (chưa có trên Chrome Web Store).  
   - Mở trang chứa nội dung vừa sinh ở NotebookLM, chọn các đoạn hỏi/đáp và dùng extension để export thành CSV.  
   - Kiểm tra lại dấu xuống dòng, bullet để phù hợp với tiêu chuẩn “front/back” của app.

3. Sử dụng **DeepSeek** để chuyển đổi sang JSON đúng định dạng import  
   - **B1:** Tải file JSON mẫu (ví dụ `sample_deck.json`) từ repo.  
   - **B2:** Tải nội dung flashcards (CSV) đã sạch/chuẩn hóa.  
   - **B3:** Prompt đề xuất:  
     ```
     Tham khảo cấu trúc trong file JSON mẫu, hãy chuyển dữ liệu trong CSV đính kèm
     thành một deck JSON hoàn chỉnh. Giữ nguyên phân cấp topic → subtopic → card,
     đảm bảo mỗi item có _id duy nhất, parentId chính xác.
     ```
