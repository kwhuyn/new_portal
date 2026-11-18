(function(){
const slugify = (s) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const DAY = 864e5;
const now = Date.now();
const ago = (n) => now - n * DAY;
const img = (s, w = 800, h = 450) => `https://picsum.photos/seed/${s}/${w}/${h}`;
const av = (n) => `https://i.pravatar.cc/150?img=${n}`;

const users = [
  { id: 'u1', full_name: 'Nguyễn Minh Quân', email: 'admin@newsportal.vn', password: '12345678', avatar_url: av(12), role: 'admin', status: 'active', bio: 'Tổng biên tập News Portal.', created_at: ago(300) },
  { id: 'u2', full_name: 'Trần Thu Hà', email: 'ha@newsportal.vn', password: '12345678', avatar_url: av(47), role: 'member', status: 'active', bio: 'Phóng viên mảng công nghệ và kinh tế.', created_at: ago(120) },
  { id: 'u3', full_name: 'Lê Hoàng Nam', email: 'nam@newsportal.vn', password: '12345678', avatar_url: av(33), role: 'member', status: 'active', bio: 'Cộng tác viên thể thao, giải trí.', created_at: ago(60) },
  { id: 'u4', full_name: 'Phạm Gia Bảo', email: 'bao@newsportal.vn', password: '12345678', avatar_url: av(15), role: 'member', status: 'locked', bio: '', created_at: ago(30) },
];

const categories = [
  { id: 'c1', name: 'Thời sự', slug: 'thoi-su', description: 'Tin tức chính trị, xã hội trong nước và quốc tế.' },
  { id: 'c2', name: 'Công nghệ', slug: 'cong-nghe', description: 'Xu hướng công nghệ, AI, thiết bị số.' },
  { id: 'c3', name: 'Thể thao', slug: 'the-thao', description: 'Bóng đá, các giải đấu trong nước và thế giới.' },
  { id: 'c4', name: 'Giải trí', slug: 'giai-tri', description: 'Điện ảnh, âm nhạc, đời sống nghệ sĩ.' },
  { id: 'c5', name: 'Kinh tế', slug: 'kinh-te', description: 'Thị trường, doanh nghiệp, tài chính.' },
  { id: 'c6', name: 'Du lịch', slug: 'du-lich', description: 'Điểm đến và trải nghiệm (chưa có bài viết).' },
];

const tags = ['AI', 'Chuyển đổi số', 'Bóng đá', 'Điện ảnh', 'Chứng khoán', 'Giao thông', 'Giáo dục']
  .map((name, i) => ({ id: 't' + (i + 1), name, slug: slugify(name) }));

const rows = [
  ['Hà Nội khởi công tuyến đường vành đai 4 đoạn qua Hưng Yên', 'c1', 'u1', 'published', true, 1, 5230, ['t6'], 'Dự án được kỳ vọng giảm tải đáng kể cho các tuyến cửa ngõ phía Nam Thủ đô.', 'Lễ khởi công diễn ra sáng nay với sự tham dự của lãnh đạo thành phố và các nhà thầu.', 'Theo kế hoạch, toàn tuyến sẽ hoàn thành trong 30 tháng, với tổng mức đầu tư hơn 85.000 tỷ đồng.'],
  ['Mô hình AI tiếng Việt mới vượt trội trong các bài kiểm tra đọc hiểu', 'c2', 'u2', 'published', true, 2, 4120, ['t1', 't2'], 'Nhóm nghiên cứu trong nước công bố mô hình ngôn ngữ lớn được huấn luyện chuyên biệt cho tiếng Việt.', 'Mô hình được huấn luyện trên hàng trăm tỷ từ vựng thu thập từ sách, báo và văn bản pháp luật.', 'Các nhà phát triển cho biết sẽ mở một phần mã nguồn để cộng đồng cùng kiểm chứng và cải tiến.'],
  ['Đội tuyển Việt Nam thắng ngược kịch tính ở vòng loại', 'c3', 'u3', 'published', true, 2, 6890, ['t3'], 'Hai bàn thắng trong 10 phút cuối giúp thầy trò huấn luyện viên giành trọn ba điểm.', 'Trận đấu diễn ra trước hơn 40.000 khán giả trên sân nhà, bầu không khí cổ vũ rực lửa.', 'Kết quả này đưa đội tuyển lên đầu bảng với hai trận thắng sau hai lượt đấu.'],
  ['VN-Index vượt mốc kháng cự, thanh khoản cao nhất 3 tháng', 'c5', 'u2', 'published', false, 3, 2310, ['t5'], 'Dòng tiền đổ mạnh vào nhóm ngân hàng và chứng khoán kéo thị trường tăng điểm.', 'Chỉ số tăng hơn 1,5% trong phiên, khối ngoại quay lại mua ròng sau nhiều phiên bán.', 'Giới phân tích cho rằng đà tăng còn phụ thuộc vào mùa báo cáo kết quả kinh doanh quý.'],
  ['Phim Việt ra rạp dịp cuối năm: cuộc đua doanh thu nóng lên', 'c4', 'u3', 'published', false, 4, 1890, ['t4'], 'Ba bộ phim nội địa cùng ra mắt trong một tuần khiến cuộc cạnh tranh phòng vé thêm gay cấn.', 'Các nhà làm phim đều đầu tư mạnh vào truyền thông và các suất chiếu sớm.', 'Nhiều rạp cho biết lượng vé đặt trước đã vượt cùng kỳ năm ngoái.'],
  ['Chuyển đổi số trong trường học: từ phong trào đến hiệu quả thực chất', 'c1', 'u2', 'published', false, 5, 1520, ['t2', 't7'], 'Nhiều trường đã đưa học bạ điện tử và lớp học trực tuyến vào vận hành thường xuyên.', 'Giáo viên cho rằng thách thức lớn nhất là kỹ năng sử dụng công cụ và hạ tầng ở vùng sâu.', 'Bộ Giáo dục dự kiến ban hành bộ tiêu chí đánh giá mức độ chuyển đổi số của cơ sở giáo dục.'],
  ['Smartphone gập thế hệ mới giảm giá mạnh, người dùng có nên mua?', 'c2', 'u2', 'published', false, 6, 3340, ['t2'], 'Các hãng đẩy mạnh khuyến mãi khi dòng sản phẩm mới sắp ra mắt.', 'Độ bền bản lề đã được cải thiện rõ rệt so với các thế hệ đầu tiên.', 'Tuy vậy, chi phí sửa chữa màn hình vẫn là điểm cần cân nhắc với người dùng.'],
  ['Giải bóng đá phong trào TP.HCM thu hút hơn 200 đội tham dự', 'c3', 'u3', 'published', false, 7, 980, ['t3'], 'Giải đấu cuối tuần trở thành sân chơi quen thuộc của cộng đồng yêu bóng đá.', 'Ban tổ chức bố trí 12 sân thi đấu và đội ngũ y tế túc trực.', 'Vòng chung kết dự kiến diễn ra vào giữa tháng sau.'],
  ['Lạm phát cơ bản duy trì ổn định, dư địa nới lỏng chính sách còn rộng', 'c5', 'u1', 'published', false, 8, 1210, ['t5'], 'Các chuyên gia nhận định mặt bằng lãi suất có thể giữ thấp trong các quý tới.', 'Giá lương thực ổn định bù đắp cho mức tăng của giá năng lượng.', 'Ngân hàng Nhà nước cam kết điều hành linh hoạt để hỗ trợ tăng trưởng.'],
  ['Review: bom tấn khoa học viễn tưởng gây tranh cãi sau suất chiếu đầu', 'c4', 'u3', 'pending', false, 0, 0, ['t4'], 'Phim nhận về những ý kiến trái chiều về kịch bản nhưng được khen ngợi về kỹ xảo.', 'Những phút đầu phim dựng thế giới tương lai khá ấn tượng.', 'Phần sau lại sa vào nhiều tình tiết quen thuộc.'],
  ['Cách ứng dụng AI vào quản lý kho cho doanh nghiệp nhỏ', 'c2', 'u2', 'pending', false, 0, 0, ['t1'], 'Bài hướng dẫn các bước triển khai đơn giản, chi phí thấp.', 'Bước đầu tiên là chuẩn hóa dữ liệu nhập xuất tồn.', 'Sau đó doanh nghiệp có thể dùng mô hình dự báo để đề xuất lượng hàng nhập.'],
  ['Tổng hợp tin đồn chuyển nhượng mùa đông', 'c3', 'u3', 'rejected', false, 3, 0, ['t3'], 'Bài tổng hợp các nguồn tin chưa được kiểm chứng.', 'Nội dung gồm nhiều thông tin chưa rõ nguồn gốc.', 'Cần bổ sung nguồn dẫn đáng tin cậy.', 'Bài viết dựa trên nguồn tin chưa kiểm chứng, vui lòng bổ sung nguồn trích dẫn.'],
];

const articles = [];
const article_images = [];
rows.forEach((r, i) => {
  const id = 'a' + (i + 1);
  const url = img(id + 'x');
  const caption = 'Ảnh minh họa: ' + r[0].slice(0, 48);
  articles.push({
    id, title: r[0], slug: slugify(r[0]), summary: r[8],
    content: `<p>${r[9]}</p><figure><img src="${url}" alt=""/><figcaption>${caption}</figcaption></figure><h2>Diễn biến chi tiết</h2><p>${r[10]}</p>`,
    thumbnail_url: img(id), author_id: r[2], category_id: r[1], tag_ids: r[7], status: r[3],
    reject_reason: r[11] || null, views_count: r[6], is_featured: r[4], created_at: ago(r[5]) - i * 6e4,
  });
  article_images.push({ id: 'i' + (i + 1), article_id: id, image_url: url, caption });
});

const comments = [
  { id: 'm1', article_id: 'a1', user_id: 'u2', content: 'Hy vọng dự án đúng tiến độ để người dân sớm được hưởng lợi.', created_at: ago(0.5) },
  { id: 'm2', article_id: 'a1', user_id: 'u3', content: 'Tuyến đường này sẽ giảm áp lực rất lớn cho quốc lộ 1.', created_at: ago(0.3) },
  { id: 'm3', article_id: 'a3', user_id: 'u2', content: 'Trận đấu tuyệt vời, cả sân gần như vỡ òa!', created_at: ago(1) },
  { id: 'm4', article_id: 'a2', user_id: 'u3', content: 'Rất mong mô hình sớm được mở mã nguồn.', created_at: ago(1.5) },
  { id: 'm5', article_id: 'a4', user_id: 'u1', content: 'Cảm ơn bạn đọc đã theo dõi, thị trường cần thêm thời gian xác nhận xu hướng.', created_at: ago(2) },
  { id: 'm6', article_id: 'a7', user_id: 'u3', content: 'Mình vẫn chờ thế hệ tiếp theo để cân nhắc.', created_at: ago(12) },
];

window.SEED = { users, categories, articles, article_images, comments, tags };

window.slugify = slugify;
})();
