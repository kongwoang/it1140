// Explicit editorial decisions from the student-perspective review, not an
// automatic claim that question length measures cognitive difficulty.
export function reviseExisting(bank, fixtures) {
  const changes = { difficulty: 0, wording: 0, distractors: 0 };
  const byNumber = (c, n) => bank.questions.find(q => q.source === `chuong-${c}-bai-giang` && q.id.endsWith(`-${String(n).padStart(3, '0')}`));
  const levels = {
    1: { easy: '1 2 5 6 8 9 10 11 12 13 15 16 18 21 22 32 33 37 38 41 47 48 66 69 71 73 74 79 80 81 82 83 85 89 91 94 95 97 98 99 101 102 107 110 111 112 114 116 121 122 124', hard: '50 54 55 56 77 78 87 115 117 118 119' },
    2: { easy: '2 3 5 6 7 8 9 11 12 13 14 15 24 25 27 31 38 39 40 41 42 43 44 49 50 51 54 55 56 57 58 59 60 62 63 64 65 67 68 70 71 72 73 74 76 77 78 80 81 82 84 86 87 88 90 91 93 100 101 103 104 105 106 108 109 110 111 112 113 114 115 118 119 120 121 122 123 124 127 129 130 131 132 133 134 135 138 139 141 142 143 145 146 147 149 150 151 152 153 154 156 157 159', hard: '21' },
    3: { easy: '1 2 3 4 5 6 8 9 10 11 12 13 15 16 19 20 21 23 25 26 27 29 30 31 32 34 35 36 37 38 40 42 43 44 45 47 48 49 50 51 52 54 55 56 57 58 59 60 65 66 67 68 69 70 71 72 73 74 76 77 79 80 81 82 84 85 87 88 89 90 91 94 95 96 98 104 112 114 115 120 121 124 125 126 129 130 131 132 133 134 136 137 138 139 145 147 148 152 153 161 181 185 186 189 190 192 195 196 197 198 199 201 202 203 204 206 207 209 211 212', hard: '' },
    4: { easy: '1 2 3 4 5 6 7 8 9 10 14 15 16 18 21 22 24 26 29 34 36 37 38 39 40 41 42 43 45 46 47 49 52 55 56 58 59 63 67 69 70 71 72 73 74 75 76 78 79 80 83 89 90 91 98 100 102 105 108 109 110 112 113 116 122 123 124 127 128 130 131 132', hard: '19 20 23 64 77 88 92 94 103 114 118 119 120 129 133' },
    5: { easy: '1 2 3 5 7 9 10 11 12 13 14 15 18 19 20 22 24 25 27 30 31 32 33 34 43 44 47 48 49 50 51 52', hard: '38 39 41' },
    6: { easy: '4 5 6 7 11 15 16 17 19 20 24 25 26 27 28 29 30 31 32 33 41 42 44 46 48 50', hard: '9 21 34 36 43 45 49 51' },
    7: { easy: '1 3 4 5 8 9 10 14 21 23 25 28 30 31 34 35 37 38 41 43 45 48 50 51 54', hard: '20 26 27 40 46 47 53 55' },
    8: { easy: '1 3 6 7 8 9 11 16 17 18 19 20 22 28 31 33 37 38 39 41 42 44 53 58 60', hard: '24 40 47 48 55 59' },
    9: { easy: '1 2 3 6 8 9 10 11 13 17 18 19 20 21 22 23 31 40 43 45 46 49 50 53 57', hard: '26 29 34 37 44 51 55 56 58' },
    10: { easy: '1 2 3 4 5 8 9 11 12 13 15 16 17 19 22 23 24 38 39 41 48 49 52 54 55 56 58 59 60 61 62 65 67 76 77 78 79 81 85 87 89 92', hard: '7 10 20 29 31 33 34 35 42 43 44 45 47 53 66 68 71 72 74 82 83 90' },
    11: { easy: '1 2 3 6 7 11 12 13 14 15 16 20 22 24 28 29 30 31 33 34 35 36 37 39 40 41 43 45 46 47 50 51 60 61 62 63 64', hard: '17 18 25 26 54 55 56 58 59 65' },
    12: { easy: '2 3 4 5 6 8 10 11 13 14 15 16 18 19 22 23 24 27 32 33 34 36 37 41 42 43 44 45 50 51 52 56 58 60 61 66 68', hard: '38 39 59 67 69 74' },
  };
  for (const [c, groups] of Object.entries(levels)) {
    const easy = new Set(groups.easy.split(' ').filter(Boolean).map(Number));
    const hard = new Set(groups.hard.split(' ').filter(Boolean).map(Number));
    for (const q of bank.questions.filter(q => q.source === `chuong-${c}-bai-giang`)) {
      const n = Number(q.id.slice(-3));
      const level = easy.has(n) ? 1 : hard.has(n) ? 3 : 2;
      if (q.difficulty !== level) { q.difficulty = level; changes.difficulty++; }
    }
  }
  const edit = (c, n, patch) => { Object.assign(byNumber(c,n), patch); changes.wording++; };
  edit(2,66,{ prompt: 'Một lệnh máy được viết gọn bằng số hệ 16 là 01D8. Vì sao cách viết này vẫn phù hợp với việc máy tính lưu lệnh dưới dạng các bit nhị phân?', choices: ['Mỗi chữ số hệ 16 được lưu thành một ký tự văn bản độc lập.', 'Hệ 16 là cách viết gọn mẫu bit nhị phân của lệnh máy.', 'CPU thực thi trực tiếp mọi văn bản có chứa chữ số hệ 16.', 'Viết bằng hệ 16 chuyển lệnh máy thành ngôn ngữ bậc cao.'] });
  edit(7,30,{ prompt: 'Cho hàm số f(x) = 2x + 7 nếu x < 0; f(0) = 7; f(x) = x² + 7 nếu x > 0. Tính f(0).', difficulty: 1 });
  edit(7,26,{ prompt: 'Trong Python, biểu thức tạo giá trị mặc định được tính một lần khi định nghĩa hàm, không phải mỗi lần gọi. Biết quy tắc này, đoạn mã sau in ra kết quả nào?\n\ndef f(x, items=[]):\n    items.append(x)\n    return len(items)\nprint(f(1), f(2))', difficulty: 2 });
  edit(8,36,{ prompt: 'isidentifier() chỉ kiểm tra hình thức định danh, không loại trừ từ khóa của Python. Đoạn mã sau in ra kết quả nào?\n\nprint("for".isidentifier(), "2a".isidentifier())', difficulty: 2 });
  edit(10,72,{ prompt: 'Một chương trình đọc tệp văn bản UTF-8 và cần quay lại đúng vị trí đã đọc trước đó. Cách nào phù hợp với quy tắc tell()/seek() của tệp văn bản?', choices: ['Lưu số ký tự đã đọc rồi dùng làm độ lệch byte bất kỳ.', 'Lấy vị trí tệp nhị phân khác rồi dùng cho tệp văn bản này.', 'Lưu giá trị do tell() trả về rồi truyền lại cho seek().', 'Tính vị trí bằng cách nhân số ký tự đã đọc với hai.'], explanation: 'Dùng lại vị trí do tell() trả về; không coi nó là chỉ số ký tự hoặc tự tính độ lệch byte với mã hóa độ dài biến đổi. (Chương 10, tr. 66–67; đối chiếu Python Text I/O.)' });
  edit(10,90,{ prompt: 'Cần lấy n dòng cuối của danh sách lines, với n không âm. Biểu thức lines[-n:] cho kết quả sai yêu cầu ở trường hợp nào?', difficulty: 2 });
  edit(11,3,{ prompt: 'Một chương trình Turtle gọi t.pensize(1), sau đó gọi t.forward(80) và t.left(90). Không có lệnh nào khác thay đổi nét bút. Nét bút lúc này rộng bao nhiêu pixel?', explanation: 'pensize(1) đặt độ rộng nét bút là 1 pixel; di chuyển và quay không thay đổi độ rộng. Câu hỏi dùng cấu hình tường minh, không yêu cầu học thuộc giá trị mặc định bị ghi khác trong slide. (Chương 11, tr. 9, 16.)', difficulty: 1 });
  // Avoid a rounding tie: formatting is the objective, not a hidden rounding rule.
  const round = byNumber(8,23);
  round.prompt = round.prompt.replace('2.25','2.26');
  round.choices = ['x=2.3','2.3=x','x=2.2','x=2.26'];
  round.explanation = '%.1f định dạng số với một chữ số sau dấu thập phân; 2.26 được làm tròn thành 2.3. %s nhận chuỗi x. (Chương 8, tr. 11.)';
  const fixture = fixtures.find(f => f.id === round.id);
  fixture.code = fixture.code.replace('2.25','2.26'); fixture.expected = 'x=2.3'; changes.wording++;
  return { changes, byNumber, edit, distractors(c,n,wrong) {
    const q = byNumber(c,n); if (!q || q.responseType !== 'choice') throw Error(`Not choice ${c}/${n}`);
    let i=0; q.choices = q.choices.map((s,index) => index === q.answer ? s : wrong[i++]);
    if (new Set(q.choices).size !== 4 || wrong.length !== 3) throw Error(`Bad revision ${c}/${n}`);
    changes.distractors++;
  }};
}
