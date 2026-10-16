import { code as c, family as f, choice as q, requireCount } from './core.mjs';
f('c5-bien-kieu',2,x=>`x = ${x}\ny = x + 2\nx *= 3\nprint(y)`,[[0,2],[-2,0],[4,6]],'y được tính khi gán; thay đổi x sau đó không tự tính lại y.');
f('c5-bien-kieu',2,x=>`a = ${x}\nb = a\na += 1\nprint(b)`,[[0,0],[-1,-1],[7,7]],'Gán b giữ đối tượng số cũ; a+=1 gán lại a, không cập nhật b.');
f('c5-bien-kieu',2,x=>`x = ${x}\ny = x\nx, y = y + 1, x - 1\nprint(x - y)`,[[0,2],[-3,2],[5,2]],'Vế phải được tính từ trạng thái cũ trước khi gán đồng thời.');
f('c5-so-hoc',2,x=>`n = ${x}\nprint(n // 4)`,[[-1,-1],[0,0],[7,1]],'Chia // làm tròn xuống; số âm không cắt về 0.');
f('c5-so-hoc',2,x=>`n = ${x}\nprint(n % 4)`,[[-5,3],[0,0],[7,3]],'Số dư thỏa n=(n//4)*4+n%4 và không âm khi số chia dương.');
f('c5-so-hoc',2,x=>`n = ${x}\nprint(2 ** n + 1)`,[[0,2],[1,3],[3,9]],'Lũy thừa được thực hiện trước phép cộng.');
f('c5-so-hoc',2,x=>`x = ${x}\nprint(-x ** 2)`,[[-3,-9],[0,0],[4,-16]],'Lũy thừa đứng trước dấu âm một ngôi; biểu thức bằng -(x**2).');
f('c5-so-hoc',2,x=>`x = ${x}\nprint(int(x))`,[[-2.9,-2],[0.9,0],[3.9,3]],'int trên số thực cắt phần lẻ về phía 0, khác floor với số âm.');
f('c5-bien-kieu',2,x=>`s = ${JSON.stringify(x)}\nprint(len(s * 2))`,[['',0],['08',4],['A B',6]],'Nhân chuỗi lặp lại nội dung, bao gồm dấu cách và số 0 đầu.');
f('c5-bien-kieu',2,x=>`s = ${JSON.stringify(x)}\nprint(int(s) + 2)`,[['000',2],['-3',-1],['15',17]],'Chuyển chuỗi hợp lệ thành số nguyên rồi mới cộng số.');
f('c5-so-hoc',2,x=>`n = ${x}\nq, r = divmod(n, 10)\nprint(q + r)`,[[0,0],[27,9],[-1,8]],'divmod trả thương làm tròn xuống và số dư; cộng hai thành phần, không cộng các chữ số của giá trị tuyệt đối.');
f('c5-so-hoc',2,x=>`a = ${x}\na += 2 * 3\na //= 2\nprint(a)`,[[-2,2],[0,3],[5,5]],'Nhân trước khi cộng gán, sau đó chia nguyên giá trị mới.');
f('c5-bien-kieu',1,x=>`x = ${x}\nprint(type(x).__name__)`,[['True','bool',['int','str','float']],['"True"','str',['bool','int','float']],['1.0','float',['int','str','bool']]],'Kiểu được quyết định bởi đối tượng được gán, không phải hình thức tên biến.');
f('c5-bien-kieu',2,x=>`print(${x})`,[['"2" + "0"','20',['2','0','2 0']],['"2" * 3','222',['6','23','2 2 2']],['str(2 + 3) + "0"','50',['5','230','TypeError']]],'Dấu + nối chuỗi nhưng cộng số; toán tử được áp dụng theo kiểu các toán hạng.');
f('c5-so-hoc',2,x=>`print(${x})`,[['3 / 2','1.5',['1','2','1.0']],['3 // 2','1',['1.5','2','1.0']],['3 / 3','1.0',['1','0','3.0']]],'Phép / trả số thực; // trên hai số nguyên trả thương nguyên làm tròn xuống.');
const singles=[
['c5-bien-kieu',2,'a, b = 2, 5\na, b = b, a + b\nprint(a * 10 + b)',57,'Vế phải dùng a=2,b=5 nên gán a=5,b=7.'],
['c5-so-hoc',3,'x = 7\nx = (x + 1) * (x - 1)\nprint(x // 5)',9,'Hai lần đọc x bên phải đều dùng 7; 48//5 bằng 9.'],
['c5-bien-kieu',2,'s = "07"\nprint(int(s) * len(s))',14,'int(s)=7 trong khi độ dài chuỗi gốc vẫn là 2.'],
['c5-bien-kieu',2,'a = 3\nb = 2\nprint(int(a / b) + len(str(a / b)))',4,'a/b bằng 1.5; phần nguyên là 1, chuỗi 1.5 dài 3.'],
['c5-so-hoc',2,'n = 367\nprint(n // 60 * 60 + n % 60)',367,'Thương và số dư tái tạo số ban đầu.'],
];
for(const [t,d,p,a,e]of singles)c(t,d,p,a,undefined,e);
for(const [p,a,w,e]of [
['Cần tính trung bình hai số nguyên a,b mà không bỏ phần lẻ. Biểu thức nào đúng?','(a + b) / 2',['a + b / 2','(a + b) // 2','a // 2 + b // 2'],'Đặt ngoặc cho tổng và dùng phép chia thực.'],
['Đầu vào là chuỗi "08". Muốn giá trị số để tính toán mà vẫn giữ bản gốc, nên làm gì?','Lưu s rồi tính n = int(s).',['Ghi đè s bằng độ dài của s.','Nối thêm "0" vào s trước mỗi phép cộng.','Đổi tên biến s thành n mà không đổi kiểu.'],'Giữ chuỗi gốc và tạo biến số mới có mục đích riêng.'],
['Biểu thức a/(b+c) có thể chia cho 0 trong trường hợp nào?','b và c đối nhau.',['a bằng 0, b+c khác 0.','b bằng c và cả hai dương.','a âm, b+c dương.'],'Mẫu số bằng 0 khi b+c=0, không phụ thuộc dấu của a.'],
['Một chương trình đọc số rồi in diện tích đúng định dạng nhưng dùng sai công thức. Ca kiểm tra nên có đặc điểm nào?','Có đầu vào và kết quả mong đợi tính độc lập.',['Chỉ kiểm tra chương trình có in một dòng hay không.','Chỉ dùng số 0 mà không tính đáp án dự kiến.','Chỉ so thời gian chạy với một trình soạn thảo.'],'Muốn phát hiện sai logic cần đối chiếu đúng giá trị theo đặc tả.'],
['Khi chuyển một công thức toán sang Python, vai trò chính của dấu ngoặc là gì?','Giữ đúng thứ tự thực hiện các phép toán.',['Đổi mọi toán hạng thành cùng kiểu dữ liệu.','Tự kiểm tra miền xác định của mọi phép chia.','Tự làm tròn kết quả về một số nguyên.'],'Dấu ngoặc nhóm biểu thức; không thay kiểm tra kiểu hoặc miền dữ liệu.'],
['Tên biến nào thể hiện rõ nhất giá trị tổng số giây?','tong_so_giay',['x1','gia_tri','ket_qua_cuoi'],'Tên có ý nghĩa làm rõ đại lượng và đơn vị, giảm nhầm lẫn.'],
['Cần sửa lỗi chương trình sau khi đã hiểu thông báo lỗi. Thao tác nào giúp kiểm chứng việc sửa?','Chạy lại ca gây lỗi và các ca đã đúng trước đó.',['Chỉ đổi tên tệp rồi kết luận chương trình đã sửa.','Chỉ xóa toàn bộ đầu vào từng làm chương trình lỗi.','Chỉ chạy với một giá trị mới chưa biết đáp án.'],'Ca hồi quy giúp kiểm tra lỗi cũ và tránh làm hỏng hành vi đã đúng.'],
['Đơn vị đầu vào là cm nhưng công thức yêu cầu m. Trước khi thế số, cần làm gì?','Chia độ dài theo cm cho 100 để đổi sang m.',['Nhân độ dài theo cm với 100 để đổi sang m.','Chỉ đổi tên biến cm thành m, giữ nguyên số.','Làm tròn cm về số nguyên trước khi dùng.'],'Cần đổi giá trị theo quan hệ đơn vị, không chỉ đổi nhãn.'],
])q('c5-so-hoc',2,p,a,w,e,'lập trình cơ bản');
requireCount(5,58);
