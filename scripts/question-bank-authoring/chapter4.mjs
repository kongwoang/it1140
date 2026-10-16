import { choice as q, numeric as n, requireCount } from './core.mjs';
// Algorithms are spelled out inside each prompt; Python is used only as an
// independent executable witness for the numerical answers.
const cases = [
['bieu-dien',2,'x = 3, y = 8. Lần lượt gán x ← y − x; y ← x + y. Giá trị cuối của y là bao nhiêu?',13,'x=3; y=8; x=y-x; y=x+y; print(y)','Phép gán thứ hai dùng x mới bằng 5.'],
['bieu-dien',2,'x = 6. Nếu x > 4 thì gán x ← x − 4. Sau đó, độc lập với nhánh trước, nếu x < 3 thì gán x ← 2x. Giá trị x cuối là bao nhiêu?',4,'x=6\nif x>4: x-=4\nif x<3: x*=2\nprint(x)','Hai điều kiện được kiểm tra lần lượt, điều kiện sau dùng trạng thái mới.'],
['bieu-dien',2,'x = 6. Nếu x > 4 thì gán x ← x − 4; nếu không, nếu x < 3 thì gán x ← 2x. Giá trị x cuối là bao nhiêu?',2,'x=6\nif x>4: x-=4\nelif x<3: x*=2\nprint(x)','Chuỗi nếu/không thì chỉ thực hiện một nhánh.'],
['so-hoc',2,'Đếm số phép lấy dư trong Euclid: bắt đầu a=35, b=15; mỗi lượt tính r=a mod b rồi cập nhật a←b, b←r; dừng khi b=0. Có bao nhiêu lượt?',2,'a,b=35,15\nc=0\nwhile b:\n a,b=b,a%b\n c+=1\nprint(c)','Các số dư lần lượt là 5 rồi 0.'],
['so-hoc',2,'Đếm số phép lấy dư trong Euclid: bắt đầu a=13, b=8; mỗi lượt cập nhật a←b, b←a_cũ mod b; dừng khi b=0. Có bao nhiêu lượt?',5,'a,b=13,8\nc=0\nwhile b:\n a,b=b,a%b\n c+=1\nprint(c)','Các cặp cập nhật là (8,5), (5,3), (3,2), (2,1), (1,0).'],
['day-so',2,'Dãy [−5, −8, −2, −2]. Khởi tạo Max bằng phần tử đầu; chỉ cập nhật khi phần tử đang xét lớn hơn Max. Sau khởi tạo, Max đổi bao nhiêu lần?',1,'a=[-5,-8,-2,-2]\nm=a[0]; c=0\nfor x in a[1:]:\n if x>m: m=x; c+=1\nprint(c)','Chỉ lần gặp -2 đầu tiên làm tăng Max.'],
['day-so',2,'Dãy [2, 2, 2, 2]. Khởi tạo p=1, duyệt các vị trí 2 đến 4 và cập nhật p khi a_i ≤ a_p. Vị trí p cuối là bao nhiêu? Đánh số từ 1.',4,'a=[2,2,2,2]; p=0\nfor i in range(1,len(a)):\n if a[i]<=a[p]: p=i\nprint(p+1)','So sánh không nghiêm ngặt giữ vị trí cuối khi có giá trị bằng nhau.'],
['day-so',2,'Dãy [2, 2, 2, 2]. Khởi tạo p=1, duyệt các vị trí 2 đến 4 và cập nhật p khi a_i < a_p. Vị trí p cuối là bao nhiêu? Đánh số từ 1.',1,'a=[2,2,2,2]; p=0\nfor i in range(1,len(a)):\n if a[i]<a[p]: p=i\nprint(p+1)','Không có phần tử nào nhỏ hơn giá trị tại p nên giữ vị trí đầu.'],
['bai-tap',2,'Dãy [8,3,8,1,8]. Khi đếm số lần xuất hiện của giá trị lớn nhất, kết quả là bao nhiêu?',3,'print([8,3,8,1,8].count(8))','Giá trị lớn nhất là 8, xuất hiện ba lần.'],
['day-so',2,'Tìm tuyến tính số 9 trong [1,3,5,7,9], dừng ngay khi gặp. Có bao nhiêu phép so sánh bằng với 9?',5,'a=[1,3,5,7,9]; print(a.index(9)+1)','Phần tử cần tìm ở cuối nên kiểm tra cả năm vị trí.'],
['day-so',2,'Tìm tuyến tính số 1 trong [1,3,5,7,9], dừng ngay khi gặp. Có bao nhiêu phép so sánh bằng với 1?',1,'print([1,3,5,7,9].index(1)+1)','Dừng ngay ở phần tử đầu.'],
['bai-tap',2,'Chèn 6 vào vị trí thứ 3 của [2,4,8,10], đánh số từ 1 và dịch phần tử cũ sang phải. Phần tử ở vị trí 4 sau chèn là bao nhiêu?',8,'a=[2,4,8,10]; a.insert(2,6); print(a[3])','Phần tử 8 cũ dịch từ vị trí 3 sang vị trí 4.'],
['bai-tap',2,'Xóa vị trí thứ 3 của [2,4,6,8,10], đánh số từ 1 và giữ thứ tự phần còn lại. Phần tử ở vị trí 3 sau xóa là bao nhiêu?',8,'a=[2,4,6,8,10]; del a[2]; print(a[2])','Phần tử phía sau được dồn trái.'],
['de-quy',3,'F(0)=2 và F(n)=2F(n−1)+1 với n>0. Tính F(3).',23,'def f(n):\n return 2 if n==0 else 2*f(n-1)+1\nprint(f(3))','F(1)=5, F(2)=11, F(3)=23.'],
['de-quy',3,'F(0)=0 và F(n)=n+F(n−1) với n>0. Tính F(5).',15,'def f(n):\n return 0 if n==0 else n+f(n-1)\nprint(f(5))','Cộng các giá trị 5,4,3,2,1 và cơ sở 0.'],
['so-hoc',2,'Kiểm tra nguyên tố P=49 bằng cách thử k=2,3,… và dừng khi gặp ước đầu tiên. Tính cả lần gặp ước, có bao nhiêu phép thử chia hết?',6,'c=0\nfor k in range(2,49):\n c+=1\n if 49%k==0: break\nprint(c)','Thử 2 đến 7 gồm sáu giá trị.'],
['bai-tap',2,'Tính trung bình cộng các số dương trong [−2,0,4,8,12]. Giá trị cần in là bao nhiêu?',8,'a=[x for x in [-2,0,4,8,12] if x>0]; print(sum(a)/len(a))','Chỉ dùng 4,8,12; số 0 không thuộc nhóm dương.'],
];
// Store whole executable programs here, converted to expressions by the runner.
for(const [t,d,p,a,program,e] of cases)n(`c4-${t}`,d,p,a,`program:${program}`,e);
for(const [start,limit,step] of [[1,10,2],[2,10,3],[10,1,-3],[0,0,1]]) {
  const vals=[]; for(let i=start;step>0?i<=limit:i>=limit;i+=step)vals.push(i);
  n('c4-bieu-dien',2,`Vòng lặp cho i chạy từ ${start} đến ${limit}, bước ${step}, lấy cả cận cuối nếu chạm tới. Thân vòng lặp chạy bao nhiêu lần?`,vals.length,`len(range(${start},${limit+(step>0?1:-1)},${step}))`,'Liệt kê các giá trị thuộc phạm vi; kiểm tra chiều bước và điều kiện dừng.');
  n('c4-bieu-dien',2,`Khởi tạo S=0. Cho i chạy từ ${start} đến ${limit}, bước ${step}, lấy cả cận cuối nếu chạm tới. Mỗi lượt cộng i vào S. Giá trị cuối của S là bao nhiêu?`,vals.reduce((a,b)=>a+b,0),`sum(range(${start},${limit+(step>0?1:-1)},${step}))`,'Cộng đúng các giá trị được vòng lặp sinh ra.');
}
for(const [start,limit,step]of [[1,17,4],[20,3,-5],[0,9,3],[5,3,1]]) {
 let x=start,c=0;while(step>0?x<limit:x>limit){x+=step;c++;}
 n('c4-bieu-dien',2,`x=${start}. Trong khi x ${step>0?'<':'>'} ${limit}, thực hiện x←x${step>0?'+':''}${step}. Khi kết thúc, x bằng bao nhiêu?`,x,`program:x=${start}\nwhile x${step>0?'<':'>'}${limit}: x+=${step}\nprint(x)`,'Điều kiện kiểm tra trước thân; giá trị cuối có thể vượt cận.');
 n('c4-bieu-dien',2,`x=${start}. Trong khi x ${step>0?'<':'>'} ${limit}, thực hiện x←x${step>0?'+':''}${step}. Thân vòng lặp chạy bao nhiêu lần?`,c,`program:x=${start}; c=0\nwhile x${step>0?'<':'>'}${limit}:\n x+=${step}\n c+=1\nprint(c)`,'Đếm lượt thực hiện, không tính lần kiểm tra cuối làm dừng.');
}
for(const size of [3,6,8])n('c4-day-so',3,`Hai vòng lặp: i từ 1 đến ${size-1}; với mỗi i, j từ i+1 đến ${size}, lấy cả hai cận. Mỗi cặp i,j thực hiện đúng một so sánh. Tổng số so sánh là bao nhiêu?`,size*(size-1)/2,`sum(range(1,${size}))`,'Số lượt vòng trong là N-1, N-2,...,1; cộng thành N(N-1)/2.');
for(const [nDisks,moves]of [[3,7],[6,63],[7,127]])n('c4-de-quy',2,`Tháp Hà Nội có ba cọc và ${nDisks} đĩa. Với công thức số bước tối thiểu T(n)=2^n−1, cần bao nhiêu bước?`,moves,`2**${nDisks}-1`,'Áp dụng công thức đã được cho ngay trong đề.');
for(const [a,b]of [[72,30],[21,14],[81,27]])n('c4-so-hoc',2,`Rút gọn phân số ${a}/${b} về dạng tối giản có mẫu dương. Mẫu số sau rút gọn là bao nhiêu?`,b/((a===72)?6:(a===21)?7:27),`${b}//__import__('math').gcd(${a},${b})`,'Chia tử và mẫu cho ƯCLN.');
const reviews = [
['quy-trinh',2,'Một chương trình tính đúng công thức nhưng đọc nhầm đơn vị cm thành m. Bước nào cần xem lại trước?', 'Đặc tả và diễn giải dữ liệu đầu vào.', ['Chỉ vị trí đặt dấu xuống dòng khi in kết quả.', 'Chỉ tên gọi của ngôn ngữ cài đặt chương trình.', 'Chỉ số lượng chú thích đặt trong mã nguồn.'], 'Đầu vào cần thống nhất đại lượng và đơn vị theo đặc tả.'],
['quy-trinh',2,'Một thuật toán đúng nhưng cần bộ nhớ vượt khả năng máy đích. Vấn đề chính là gì?', 'Tính khả thi về tài nguyên của phương pháp.', ['Cú pháp tên biến trong phần mô tả đầu vào.', 'Số lượng bộ dữ liệu mẫu được in trong đề.', 'Hình dạng ký hiệu bắt đầu của lưu đồ.'], 'Đúng kết quả chưa đủ nếu không triển khai được với tài nguyên cho phép.'],
['dac-trung',2,'Một chương trình cho đúng ba ví dụ nhưng chưa xét đầu vào khác trong miền hợp lệ. Có thể kết luận gì?', 'Các ví dụ chưa chứng minh tính đúng với cả miền đầu vào.', ['Chương trình chắc chắn đúng vì có nhiều hơn hai ví dụ.', 'Thuật toán không cần đặc tả vì đã có kết quả ví dụ.', 'Tính hữu hạn được chứng minh chỉ bằng ba kết quả đúng.'], 'Chạy thử phát hiện lỗi nhưng không thay chứng minh tổng quát.'],
['dac-trung',2,'Một vòng lặp giảm số nguyên dương n đi 1 mỗi lượt và dừng tại 0. Điều gì hỗ trợ lập luận kết thúc?', 'n giảm dần và bị chặn dưới bởi giá trị dừng.', ['Tên n được đặt theo quy ước của biến số nguyên.', 'Mỗi lượt đều in một dòng trạng thái lên màn hình.', 'Thân vòng lặp có ít hơn mười câu lệnh xử lý.'], 'Đại lượng tiến đến biên là căn cứ kết thúc, không phải hình thức mã.'],
['bieu-dien',2,'Cần kiểm tra vòng lặp while có thể chạy 0 lần. Nên chọn dữ liệu nào?', 'Dữ liệu làm điều kiện sai ngay lần kiểm tra đầu.', ['Dữ liệu làm điều kiện đúng trong mọi lần kiểm tra.', 'Dữ liệu khiến biến lặp không đổi trong thân lặp.', 'Dữ liệu khiến lệnh in luôn nằm trong nhánh đúng.'], 'Kiểm tra trước thân cho phép không thực hiện lần nào.'],
['bieu-dien',2,'Một chương trình tính tổng từ 1 đến n bằng vòng lặp. Dữ liệu nào giúp phát hiện việc bỏ sót số hạng n?', 'n=1 với kết quả mong đợi bằng 1.', ['n rất lớn nhưng không có kết quả mong đợi.', 'Một chuỗi bất kỳ thay cho dữ liệu số nguyên.', 'n ngoài miền cho phép và không có quy ước xử lý.'], 'Trường hợp nhỏ nhất làm sai cận dễ quan sát và có đáp án rõ.'],
['day-so',2,'Hàm tìm Max khởi tạo bằng 0 bị sai với loại dữ liệu nào?', 'Dãy không rỗng chỉ gồm các số âm.', ['Dãy chỉ gồm các số nguyên dương khác nhau.', 'Dãy chứa 0 và ít nhất một số nguyên dương.', 'Dãy tăng dần từ 0 đến một số nguyên dương.'], '0 không thuộc dãy và lớn hơn mọi giá trị âm.'],
['day-so',2,'Muốn phát hiện thuật toán trả nhầm vị trí cuối thay vì vị trí đầu của giá trị nhỏ nhất, chọn dãy nào?', '[4,1,3,1]', ['[1,2,3,4]','[4,3,2,1]','[2,3,1,4]'], 'Cần có ít nhất hai lần xuất hiện của giá trị nhỏ nhất.'],
['day-so',2,'Thuật toán tìm kiếm trả về 0 khi không tìm thấy, trong khi vị trí được đánh số từ 0. Vấn đề nào xuất hiện?', 'Không phân biệt được không tìm thấy với tìm thấy ở đầu dãy.', ['Không thể tìm phần tử cuối trong bất kỳ dãy nào.', 'Mọi phần tử dãy bị đổi thành 0 trong lúc tìm.', 'Tìm tuyến tính tự đổi thành tìm kiếm nhị phân.'], 'Giá trị báo không tìm thấy phải phân biệt với chỉ số hợp lệ.'],
['bai-tap',3,'Khi đếm số lần xuất hiện của Max, chương trình chỉ tăng count khi x=Max nhưng không đặt lại count khi x>Max. Dãy nào bộc lộ lỗi?', '[2,2,5]', ['[5,2,2]','[5,5,2]','[5,5,5]'], 'Hai số 2 được đếm trước khi Max đổi thành 5; cần đặt count=1.'],
['bai-tap',2,'Trung bình cộng các số dương cần tính tổng và số lượng của nhóm nào?', 'Chỉ các phần tử lớn hơn 0.', ['Mọi phần tử lớn hơn hoặc bằng 0.', 'Tổng mọi phần tử nhưng đếm riêng số dương.', 'Tổng số dương nhưng đếm toàn bộ phần tử.'], 'Tử và mẫu phải cùng ứng với đúng nhóm cần thống kê.'],
['so-hoc',2,'Một kiểm tra nguyên tố coi 1 là nguyên tố. Dữ liệu nhỏ nào trực tiếp kiểm tra được lỗi này?', 'Đầu vào 1, kết quả mong đợi là không nguyên tố.', ['Đầu vào 2, kết quả mong đợi là nguyên tố.', 'Đầu vào 9, kết quả mong đợi là không nguyên tố.', 'Đầu vào 11, kết quả mong đợi là nguyên tố.'], 'Ca kiểm tra cần đi đúng trường hợp sai, không chỉ dùng nhiều số.'],
['so-hoc',3,'Muốn kiểm tra vòng thử ước k*k < n bị thiếu dấu bằng, nên chọn số nào?', '25.', ['23.', '26.', '27.'], '25 là bình phương số nguyên tố 5; ước quyết định nằm đúng tại căn bậc hai.'],
['de-quy',2,'Một hàm đệ quy dừng khi n=0 và gọi lại với n−2. Đầu vào nào có thể không đạt cơ sở nếu n ban đầu là số nguyên không âm?', 'n=3.', ['n=0.','n=2.','n=4.'], 'Dãy số lẻ 3,1,-1,... không gặp 0.'],
['de-quy',2,'Hàm đệ quy có bước gọi với n−1. Muốn xử lý n=0 mà không gọi sang số âm, cần đặt điều kiện nào trước lời gọi?', 'Nếu n=0 thì trả kết quả cơ sở.', ['Sau lời gọi luôn tăng n thêm 1.', 'Nếu n<0 thì gọi tiếp với n−1.', 'Trước lời gọi luôn gán n thành 1.'], 'Kiểm tra cơ sở phải ngăn nhánh đệ quy tiếp tục.'],
['hinh-thang',3,'Tam giác phụ của hình thang có cạnh a,c,d−b. Nếu d=b thì công thức chiều cao có mẫu d−b gặp vấn đề gì?', 'Mẫu bằng 0 nên phải xử lý trường hợp này riêng.', ['Tam giác phụ chắc chắn có chiều cao lớn nhất.', 'Có thể giữ công thức vì 0 không ảnh hưởng phép chia.', 'Diện tích hình thang chắc chắn bằng 0 với mọi a,c.'], 'Miền áp dụng công thức phải loại phép chia cho 0.'],
['hinh-thang',2,'Tam giác phụ có ba cạnh 2,5,3. Vì sao không dùng Heron để coi đây là hình thang không suy biến?', 'Hai cạnh cộng lại bằng cạnh còn lại nên tam giác suy biến.', ['Vì có hai cạnh lẻ nên không thể tính nửa chu vi.', 'Vì cạnh lớn nhất bắt buộc phải bằng cạnh nhỏ nhất.', 'Vì Heron chỉ áp dụng được cho tam giác đều.'], 'Cần bất đẳng thức tam giác nghiêm ngặt.'],
['ung-dung',2,'Bài toán cần sắp xếp dãy trước khi tìm kiếm nhiều lần. Cặp nhiệm vụ nào cần được phân biệt?', 'Tổ chức lại thứ tự dữ liệu và xác định phần tử cần tìm.', ['Mã hóa dữ liệu bí mật và kiểm tra chữ ký số.', 'Tìm đường đi trên mạng và phân giải tên miền.', 'Tính giá trị băm và sinh khóa đối xứng cho dãy.'], 'Sắp xếp và tìm kiếm giải hai yêu cầu khác nhau.'],
];
for(const [t,d,p,a,w,e]of reviews)q(`c4-${t}`,d,p,a,w,e);
// Counterexamples: the wrong implementation is fully described, and every
// candidate is in the stated domain, so the learner must find a real failure.
const counter = [
['Tìm Max khởi tạo Max=0, rồi chỉ tăng Max khi gặp giá trị lớn hơn.','[-3,-1]',['[0,1]','[1,2]','[-1,2]'],'Max sai khi cả dãy âm.'],
['Tính trung bình dãy bằng tổng chia cho số phần tử; không kiểm tra dãy rỗng.','[]',['[0]','[1,-1]','[2,2]'],'Dãy rỗng gây chia cho 0.'],
['Tìm giá trị nhỏ nhất nhưng bỏ qua phần tử đầu, chỉ xét từ phần tử thứ hai.','[1,4,7]',['[7,4,1]','[4,1,7]','[7,1,4]'],'Giá trị nhỏ nhất ở đầu sẽ bị bỏ sót.'],
['Đếm số chẵn bằng điều kiện x>0 và x mod 2=0. Yêu cầu đếm cả số chẵn âm và 0.','[-2,0]',['[2,4]','[1,3]','[2,3]'],'Điều kiện x>0 loại sai số âm chẵn và 0.'],
['Kiểm tra dãy tăng nghiêm ngặt nhưng dùng điều kiện phần tử sau ≥ phần tử trước.','[1,1,2]',['[1,2,3]','[3,2,1]','[1,3,2]'],'Dấu bằng làm nhận nhầm dãy có phần tử kề nhau bằng nhau.'],
['Đếm giá trị lớn nhất, mỗi lần gặp x>Max đặt count=0 thay vì 1.','[1,3]',['[3,1]','[3,3]','[3,2,1]'],'Lần xuất hiện đầu của Max mới bị bỏ khỏi số đếm.'],
['Tìm A trong dãy; nếu kiểm tra phần tử đầu không khớp thì kết luận ngay không có.','A=3, dãy [1,3]',['A=1, dãy [1,3]','A=4, dãy [1,3]','A=2, dãy [2,2]'],'Kết luận quá sớm bỏ các vị trí phía sau.'],
['Hoán đổi X,Y bằng X←Y rồi Y←X, không có biến tạm.','X=2, Y=5',['X=2, Y=2','X=0, Y=0','X=-1, Y=-1'],'Hai giá trị khác nhau làm lộ việc mất X ban đầu.'],
['Rút gọn a/b bằng ƯCLN nhưng không chuyển dấu để mẫu luôn dương.','a=2, b=-4',['a=2, b=4','a=-2, b=4','a=0, b=4'],'Mẫu âm vẫn âm sau khi chia ƯCLN dương.'],
['Miền đầu vào cho phép a≤b, nhưng chương trình báo lỗi khi a≥b.','a=3, b=3',['a=1, b=2','a=-2, b=0','a=2, b=5'],'Chương trình loại nhầm trường hợp a=b dù đặc tả cho phép.'],
['Tính tổng số dương nhưng dùng điều kiện x≥0; sau đó chia cho số phần tử đã chọn để lấy trung bình.','[0,2]',['[1,2]','[-1,2]','[2,4]'],'Đếm thêm 0 vào mẫu làm sai trung bình số dương.'],
['Lấy giá trị thứ hai của dãy mà không kiểm tra số lượng; miền đầu vào cho phép dãy không rỗng.','[7]',['[7,8]','[7,8,9]','[1,1]'],'Dãy một phần tử không có vị trí thứ hai.'],
];
for(const [alg,a,w,e]of counter)q('c4-bai-tap',3,`${alg}\nBộ dữ liệu nào dưới đây làm bộc lộ lỗi đã nêu?`,a,w,e,'tìm phản ví dụ');
// Three boundary cases about counting comparisons, not another full sort trace.
for(const [size,expected]of [[1,0],[2,1],[10,9]])n('c4-day-so',2,`Tìm Max của dãy không rỗng có ${size} phần tử: khởi tạo từ phần tử đầu, so sánh mỗi phần tử còn lại đúng một lần. Có bao nhiêu phép so sánh giá trị?`,expected,`${size}-1`,'Phần tử đầu dùng khởi tạo; còn N-1 phần tử để so sánh.');
q('c4-de-quy',3,'Một hàm có cơ sở n≤1 trả về 1; trường hợp còn lại trả về n nhân kết quả gọi với n−1. Khi đầu vào n=4, số phép nhân thực sự được thực hiện là bao nhiêu?', '3.', ['4.','5.','2.'], 'Các phép nhân ở n=4,3,2; n=1 trả trực tiếp cơ sở.');
q('c4-day-so',3,'Hai dãy đã tăng dần được trộn bằng cách so phần tử chưa dùng đầu tiên của mỗi dãy. Nếu dãy A đã dùng hết nhưng B còn phần tử, cần làm gì?', 'Đưa toàn bộ phần chưa dùng của B vào cuối kết quả.', ['Dừng ngay và bỏ các phần tử còn lại của B.', 'Chép lại toàn bộ B kể cả những phần tử đã dùng.', 'Đưa lại phần tử đầu của A để so sánh với B.'], 'Phần còn lại của B đã tăng dần và không nhỏ hơn phần cuối đã chọn.');
requireCount(4,77);
