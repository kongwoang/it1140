# Biên tập ngân hàng câu hỏi

## Tiến độ

Đợt 1: đã biên tập thủ công **50/208 câu chương 1**, thuộc cả 8 nhóm kiến thức. Đây là đợt mẫu để xem lại cách hỏi trước khi tiếp tục, **không phải xác nhận đã rà hết 2.096 câu**. Nội dung mới nằm trong bộ riêng tư tại `vm/deploy/content/`, không thay bộ đề GitHub Pages.

Giữ nguyên ID, chỉ số đáp án, chương, nhóm, loại câu và các trường liên kết. Thay câu dẫn, phương án nhiễu, lời giải và mức khó khi cần. Đã đối chiếu lời giải của 50 câu và thêm 32 kiểm tra độc lập về phép tính, bit, mã ký tự hoặc giới hạn biểu diễn. Các kiểm tra này không thay thế việc đọc hiểu và thẩm định chuyên môn.

## Quy tắc cho các đợt tiếp theo

- Câu dẫn hỏi một việc cụ thể, đủ dữ kiện: cơ số, độ rộng bit, có dấu/không dấu, quy tắc làm tròn hoặc quy ước đơn vị nếu kết quả phụ thuộc chúng. Không bắt người học đoán ngữ cảnh của câu trước.
- Diễn đạt theo thuật ngữ bài giảng, ngắn và tự nhiên; tránh câu chuyện dài không phục vụ kiến thức cần kiểm tra. Không thêm từ khó để nâng mức khó.
- Phương án nhiễu dựa vào lỗi có thể mắc: nhầm bit/byte, thứ tự đổi cơ số, có dấu/không dấu, nhớ/tràn, ký tự/giá trị. Các phương án cùng kiểu, cùng đơn vị và tương đương về cách trình bày. Tránh một đáp án dài hoặc cụ thể nổi bật hẳn.
- Tính lại đáp án sau khi đổi dữ kiện; kiểm tra cả phương án sai, đặc biệt câu nhiều đáp án và các từ “luôn”, “chỉ”, “không”. Lời giải phải phù hợp các phương án mới.
- Mức 1: nhớ/hiểu hoặc một thao tác trực tiếp; mức 2: áp dụng, đối chiếu hay nhiều bước quen thuộc; mức 3: thực sự cần kết hợp kiến thức hoặc lập luận thêm. Câu cơ bản đúng mục đích không nhất thiết phải làm khó hơn.
- Dùng backtick cho đoạn mã, biểu thức bit hoặc giá trị cần font code. Không đổi chỗ đáp án chỉ để cân bằng chữ cái nếu ảnh hưởng tiến độ cũ.
- Không ghi “đề thi HUST” nếu chưa đối chiếu được đề gốc. Không dùng thay từ hàng loạt làm bằng chứng đã thẩm định toàn bộ ngân hàng.

## Áp dụng một đợt có kiểm soát

Từ gốc repository, kiểm tra cả bộ riêng tư:

```sh
node scripts/validate-data.mjs \
  --subject-file commerce/vm/deploy/content/subjects/it1140.json \
  --python-file commerce/vm/deploy/content/python-exercises.json
```

`scripts/review-question-bank.mjs` nhận một kế hoạch JSON gồm 1–100 thay đổi đã được người biên tập chọn rõ. Mỗi dòng có `id`, `reason`, `beforeSHA`, `afterSHA` và `fields` (chỉ `prompt`, `choices`, `explanation`, `difficulty`). SHA-256 tính từ `JSON.stringify(question)` bằng hàm `fingerprint` được export. Không cho sửa ID, khóa đáp án hoặc loại câu qua công cụ này. Đổi khóa đáp án cần quy trình sửa lỗi riêng, không lách qua đợt biên tập.

```sh
node scripts/review-question-bank.mjs \
  --bank commerce/vm/deploy/content/subjects/it1140.json \
  --python commerce/vm/deploy/content/python-exercises.json \
  --plan commerce/vm/deploy/content/authoring/selected-plan.json \
  --audit commerce/vm/deploy/content/authoring/unique-audit.json
```

Công cụ từ chối nội dung đã đổi kể từ lúc lập kế hoạch, kiểm tra toàn bộ cấu trúc, lưu bản trước/sau vào audit mới (mode 600, không ghi đè), rồi thay file qua tệp tạm cùng thư mục. Chạy lại đợt đã áp dụng là no-op. Audit có thể đã được ghi nếu thao tác bị gián đoạn trước khi thay ngân hàng: đối chiếu `bankBeforeSHA`/`bankAfterSHA`, không chỉ dựa vào việc audit tồn tại.

Kế hoạch, audit và biên bản kiểm tra của bộ thương mại phải ở thư mục riêng tư, không đưa lên Git công khai. Sao lưu trước/sau; khởi động lại preview sau khi sửa vì ngân hàng được đọc lúc khởi động. Không thay allowlist miễn phí chỉ để xem câu vừa sửa.
