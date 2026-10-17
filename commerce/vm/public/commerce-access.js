(() => {
  const original=window.fetch.bind(window);
  window.fetch=async(input,options={})=>{
    const path=typeof input==='string'?new URL(input,location.href).pathname:new URL(input.url).pathname;
    const response=await original(input,{credentials:'same-origin',cache:'no-store',...options});
    if(path.startsWith('/api/course/')){
      if(response.status===401||response.status===403){window.IT1140Study?.block('Phiên đăng nhập đã kết thúc. Vui lòng quay lại tài khoản.',true);}
      else if(response.status===409){const data=await response.clone().json();if(data.error==='study_conflict')window.IT1140Study?.block('Phiên học đã chuyển sang trình duyệt khác.');}
    }
    return response;
  };
})();
