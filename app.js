// --- BAGIAN 1: SELEKSI ELEMEN DOM ---
const navKesalahan = document.getElementById('nav-kesalahan');
const navBoxNama = document.getElementById('nav-boxnama');
const navDataStaff = document.getElementById('nav-datastaff');
const navTambah = document.getElementById('nav-tambah');
const pageKesalahan = document.getElementById('page-kesalahan');
const pageBoxNama = document.getElementById('page-boxnama');
const pageDataStaff = document.getElementById('page-datastaff');
const pageTambah = document.getElementById('page-tambah');
const form = document.getElementById('auto-parser-form');
const reportInput = document.getElementById('report-input');
const messageArea = document.getElementById('message-area');
const fromDateEl = document.getElementById('fromDate');
const toDateEl = document.getElementById('toDate');
const employeeSearchEl = document.getElementById('employee-search');
const tableBody = document.getElementById('errors-table-body');
const clearButton = document.getElementById('clear-data');
const summaryCards = { deposit: document.getElementById('deposit-errors'), withdraw: document.getElementById('withdraw-errors'), late: document.getElementById('late-arrivals'), other: document.getElementById('other-errors') };
const staffSummaryContainer = document.getElementById('staff-summary-container');
const addStaffBtn = document.getElementById('add-staff-btn');
const exportExcelBtn = document.getElementById('export-excel-btn');
const staffTableBody = document.getElementById('staff-table-body');
const staffFormModal = document.getElementById('staff-form-modal');
const closeFormModalBtn = document.querySelector('#staff-form-modal .modal-close');
const staffForm = document.getElementById('staff-form');
const modalTitle = document.getElementById('modal-title');
const staffViewModal = document.getElementById('staff-view-modal');
const closeViewModalBtn = document.querySelector('#staff-view-modal .modal-close');
const errorViewModal = document.getElementById('error-view-modal');
const closeErrorViewModalBtn = document.querySelector('#error-view-modal .modal-close');

// --- BAGIAN 2: LOGIKA NAVIGASI ---
function showPage(pageId) {
    [pageKesalahan, pageBoxNama, pageDataStaff, pageTambah].forEach(p => p.style.display = 'none');
    [navKesalahan, navBoxNama, navDataStaff, navTambah].forEach(n => n.classList.remove('active'));
    let pageToShow, navToActivate;
    switch (pageId) {
        case 'boxnama': pageToShow = pageBoxNama; navToActivate = navBoxNama; renderStaffSummary(); break;
        case 'datastaff': pageToShow = pageDataStaff; navToActivate = navDataStaff; renderStaffTable(); break;
        case 'tambah': pageToShow = pageTambah; navToActivate = navTambah; break;
        default: pageToShow = pageKesalahan; navToActivate = navKesalahan; updateDashboard(); break;
    }
    pageToShow.style.display = 'block';
    navToActivate.classList.add('active');
}
[navKesalahan, navBoxNama, navDataStaff, navTambah].forEach(nav => nav.addEventListener('click', (e) => { e.preventDefault(); showPage(nav.id.split('-')[1]); }));

// --- BAGIAN 3: FUNGSI-FUNGSI UTAMA ---
function parseReportText(text){const findValue=key=>(new RegExp(`^${key}\\s*:\\s*(.*)$`,"im")).exec(text);return{perihal:findValue("Perihal")?findValue("Perihal")[1].trim():"Tidak Ditemukan",staff:findValue("Staff")?findValue("Staff")[1].trim():"Tidak Ditemukan",full_text:text}}
function getStoredErrors(){const errors=localStorage.getItem("staffErrorsV3");return errors?JSON.parse(errors):[]}
function saveErrorsList(errorsList) { localStorage.setItem('staffErrorsV3', JSON.stringify(errorsList)); }
function updateDashboard(){let errors=getStoredErrors();const fromDate=fromDateEl.value?new Date(fromDateEl.value).setHours(0,0,0,0):null,toDate=toDateEl.value?new Date(toDateEl.value).setHours(23,59,59,999):null,searchTerm=employeeSearchEl.value.toLowerCase();let filteredErrors=errors.filter(e=>{const errorDate=new Date(e.tanggal),dateMatch=(!fromDate||errorDate>=fromDate)&&(!toDate||errorDate<=toDate),employeeMatch=(searchTerm===""||e.staff.toLowerCase().includes(searchTerm));return dateMatch&&employeeMatch});const countDeposit=filteredErrors.filter(e=>e.perihal.toLowerCase().includes("deposit")).length,countWithdraw=filteredErrors.filter(e=>e.perihal.toLowerCase().includes("withdraw")).length,countLate=filteredErrors.filter(e=>e.perihal.toLowerCase().includes("telat")).length;summaryCards.deposit.textContent=countDeposit;summaryCards.withdraw.textContent=countWithdraw;summaryCards.late.textContent=countLate;const categorizedCount=countDeposit+countWithdraw+countLate;summaryCards.other.textContent=filteredErrors.length-categorizedCount;tableBody.innerHTML="";if(filteredErrors.length===0){tableBody.innerHTML='<tr><td colspan="6" style="text-align:center; font-style:italic;">Tidak ada data yang cocok dengan filter.</td></tr>';return}
filteredErrors.sort((a,b)=>b.id-a.id).forEach(err=>{const row=`<tr><td>${err.id}</td><td>${new Date(err.tanggal).toLocaleString("id-ID")}</td><td>${err.staff}</td><td>Staff</td><td>${err.perihal}</td><td><div class="button-wrapper" style="justify-content: center; margin: 0; gap: 10px;"><button class="btn btn-sm btn__view btn-view-error" data-id="${err.id}"><i class="bi bi-eye-fill"></i></button><button class="btn btn-sm btn__danger btn-delete-error" data-id="${err.id}"><i class="bi bi-trash-fill"></i></button></div></td></tr>`;tableBody.innerHTML+=row})}
function openErrorViewModal(error) { document.getElementById('error-view-modal-title').textContent = `Detail Laporan: ${error.perihal}`; document.getElementById('view-error-report').textContent = error.full_text; errorViewModal.style.display = 'flex'; }
function renderStaffSummary(){const errors=getStoredErrors();const staffData={};errors.forEach(err=>{if(!staffData[err.staff]){staffData[err.staff]={deposit:0,withdraw:0,telat:0}}
const perihal=err.perihal.toLowerCase();if(perihal.includes("deposit"))staffData[err.staff].deposit++;else if(perihal.includes("withdraw"))staffData[err.staff].withdraw++;else if(perihal.includes("telat"))staffData[err.staff].telat++});staffSummaryContainer.innerHTML="";const staffNames=Object.keys(staffData).sort();if(staffNames.length===0){staffSummaryContainer.innerHTML='<p style="text-align:center; font-style:italic;">Belum ada data kesalahan untuk ditampilkan.</p>';return}
staffNames.forEach(name=>{const data=staffData[name];const staffBoxHTML=`<div class="staff-box"><div class="staff-box-header">${name}</div><div class="staff-box-categories"><div class="category-item">Deposit</div><div class="category-item">Withdraw</div><div class="category-item">Telat</div></div><div class="staff-box-counts"><div class="count-item">${data.deposit}</div><div class="count-item">${data.withdraw}</div><div class="count-item">${data.telat}</div></div></div>`;staffSummaryContainer.innerHTML+=staffBoxHTML})}
function getStoredStaff() { const staff = localStorage.getItem('staffProfiles'); return staff ? JSON.parse(staff) : []; }
function saveStaff(staffList) { localStorage.setItem('staffProfiles', JSON.stringify(staffList)); }
function parseDate(dateString) { if (!dateString || typeof dateString !== 'string') return null; let date; if (dateString.includes('-')) { const parts = dateString.split('-'); if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return null; date = new Date(parts[0], parts[1] - 1, parts[2]); } else if (dateString.includes('/')) { const parts = dateString.split('/'); if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return null; date = new Date(parts[2], parts[1] - 1, parts[0]); } else { return null; } return isNaN(date.getTime()) ? null : date; }
function calculateAge(birthDateString) { const birthDate = parseDate(birthDateString); if (!birthDate) return null; const today = new Date(); let age = today.getFullYear() - birthDate.getFullYear(); const monthDifference = today.getMonth() - birthDate.getMonth(); if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) { age--; } return age; }
function renderStaffTable() {
    staffTableBody.innerHTML = '';
    const staffList = getStoredStaff();
    if (staffList.length === 0) { staffTableBody.innerHTML = `<tr><td colspan="10" style="text-align:center; font-style:italic;">Belum ada data staff.</td></tr>`; return; }
    staffList.forEach((staff, index) => {
        let usia = ''; const calculatedAge = calculateAge(staff.tanggalLahir); if (calculatedAge !== null && calculatedAge >= 0) { usia = `${calculatedAge} TAHUN`; }
        const row = `
            <tr>
                <td>${index + 1}</td><td>${staff.namaStaff || ''}</td><td>${staff.noPassport || ''}</td>
                <td>${staff.jabatan || ''}</td><td>${staff.tempatLahir || ''}</td><td>${staff.tanggalLahir || ''}</td>
                <td>${usia}</td><td>${staff.emailKerja || ''}</td><td>${staff.adminIdn || ''}</td>
                <td>
                    <div class="button-wrapper" style="justify-content: flex-start; margin: 0;">
                        <button class="btn btn-sm btn__view btn-view-staff" data-id="${staff.id}"><i class="bi bi-eye-fill"></i></button>
                        <button class="btn btn-sm btn__info btn-edit" data-id="${staff.id}"><i class="bi bi-pencil-fill"></i></button>
                        <button class="btn btn-sm btn__danger btn-delete" data-id="${staff.id}"><i class="bi bi-trash-fill"></i></button>
                    </div>
                </td>
            </tr>`;
        staffTableBody.innerHTML += row;
    });
}
function openViewModal(staff) {
    document.getElementById('view-modal-title').textContent = `Lihat Data: ${staff.namaStaff}`; let usia = ''; const calculatedAge = calculateAge(staff.tanggalLahir); if (calculatedAge !== null && calculatedAge >= 0) { usia = `${calculatedAge} TAHUN`; }
    let masaKerja = ''; const joinDate = parseDate(staff.tglGabungSmb); if(joinDate) { const diffDays = Math.ceil(Math.abs(new Date() - joinDate) / (1000 * 60 * 60 * 24)); const years = Math.floor(diffDays / 365); const months = Math.floor((diffDays % 365) / 30); masaKerja = `${years} thn, ${months} bln`; }
    document.getElementById('view-nama-staff').textContent = staff.namaStaff || '-'; document.getElementById('view-no-passport').textContent = staff.noPassport || '-'; document.getElementById('view-jabatan').textContent = staff.jabatan || '-'; document.getElementById('view-tempat-lahir').textContent = staff.tempatLahir || '-'; document.getElementById('view-tanggal-lahir').textContent = staff.tanggalLahir || '-'; document.getElementById('view-usia').textContent = usia || '-'; document.getElementById('view-jenis-kelamin').textContent = staff.jenisKelamin || '-'; document.getElementById('view-kamar-mess').textContent = staff.kamarMess || '-'; document.getElementById('view-tgl-gabung-smb').textContent = staff.tglGabungSmb || '-'; document.getElementById('view-masa-kerja').textContent = masaKerja || '-'; document.getElementById('view-join-togelup').textContent = staff.joinTogelup || '-'; document.getElementById('view-jam-kerja').textContent = staff.jamKerja || '-'; document.getElementById('view-admin-idn').textContent = staff.adminIdn || '-'; document.getElementById('view-admin-power').textContent = staff.adminPower || '-'; document.getElementById('view-email-kerja').textContent = staff.emailKerja || '-';
    staffViewModal.style.display = 'flex';
}
function exportToExcel() {
    const staffList = getStoredStaff();
    if (staffList.length === 0) { alert("Tidak ada data staff untuk di-export."); return; }
    const dataToExport = staffList.map((staff, index) => ({ 'NO': index + 1, 'NAMA STAFF': staff.namaStaff || '', 'No Passport': staff.noPassport || '', 'JABATAN': staff.jabatan || '' }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Staff");
    XLSX.writeFile(workbook, "Data_Staff.xlsx");
}

// --- BAGIAN 4: EVENT LISTENERS ---
form.addEventListener('submit', function(event){ event.preventDefault(); const inputText = reportInput.value; if (inputText.trim() === "") return; const extractedData = parseReportText(inputText); const newError = { id: Date.now(), tanggal: (new Date).toISOString(), ...extractedData }; const errors = getStoredErrors(); errors.push(newError); saveErrorsList(errors); messageArea.innerHTML = '<p style="color:hsl(144, 100%, 65%); text-align:center;">Berhasil!</p>'; form.reset(); setTimeout(() => { messageArea.innerHTML = ""; showPage('kesalahan') }, 1500) });
clearButton.addEventListener('click', function(){ if (confirm('APAKAH ANDA YAKIN? Semua data KESALAHAN akan dihapus permanen.')) { saveErrorsList([]); updateDashboard(); if (pageBoxNama.style.display === "block") { renderStaffSummary() } } });
[fromDateEl, toDateEl, employeeSearchEl].forEach(el => el.addEventListener('input', updateDashboard));
addStaffBtn.addEventListener('click', () => { staffForm.reset(); document.getElementById('staff-id').value = ''; modalTitle.textContent = 'Tambah Staff Baru'; staffFormModal.style.display = 'flex'; });
closeFormModalBtn.addEventListener('click', () => { staffFormModal.style.display = 'none'; });
window.addEventListener('click', (event) => { if (event.target == staffFormModal) { staffFormModal.style.display = 'none'; } });
closeViewModalBtn.addEventListener('click', () => { staffViewModal.style.display = 'none'; });
window.addEventListener('click', (event) => { if (event.target == staffViewModal) { staffViewModal.style.display = 'none'; } });
closeErrorViewModalBtn.addEventListener('click', () => { errorViewModal.style.display = 'none'; });
window.addEventListener('click', (event) => { if (event.target == errorViewModal) { errorViewModal.style.display = 'none'; } });
staffForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const staffId = document.getElementById('staff-id').value;
    const staffData = {
        id: staffId ? parseInt(staffId) : Date.now(),
        namaStaff: document.getElementById('nama-staff').value, noPassport: document.getElementById('no-passport').value,
        jabatan: document.getElementById('jabatan').value, tempatLahir: document.getElementById('tempat-lahir').value,
        tanggalLahir: document.getElementById('tanggal-lahir').value, jenisKelamin: document.getElementById('jenis-kelamin').value,
        kamarMess: document.getElementById('kamar-mess').value, tglGabungSmb: document.getElementById('tgl-gabung-smb').value,
        joinTogelup: document.getElementById('join-togelup').value, jamKerja: document.getElementById('jam-kerja').value,
        adminIdn: document.getElementById('admin-idn').value, adminPower: document.getElementById('admin-power').value,
        emailKerja: document.getElementById('email-kerja').value,
    };
    let staffList = getStoredStaff();
    if (staffId) { staffList = staffList.map(s => s.id === staffData.id ? staffData : s); } 
    else { staffList.push(staffData); }
    saveStaff(staffList);
    renderStaffTable();
    staffFormModal.style.display = 'none';
});
staffTableBody.addEventListener('click', (event) => {
    const target = event.target.closest('button');
    if (!target) return;
    const id = parseInt(target.dataset.id);
    const staffList = getStoredStaff();
    const staffToActOn = staffList.find(s => s.id === id);
    if (!staffToActOn) return;
    if (target.classList.contains('btn-view-staff')) {
        openViewModal(staffToActOn);
    } else if (target.classList.contains('btn-delete')) {
        if (confirm('Apakah Anda yakin ingin menghapus data staff ini?')) {
            const updatedList = staffList.filter(s => s.id !== id);
            saveStaff(updatedList);
            renderStaffTable();
        }
    } else if (target.classList.contains('btn-edit')) {
        document.getElementById('staff-id').value = staffToActOn.id;
        document.getElementById('nama-staff').value = staffToActOn.namaStaff;
        document.getElementById('no-passport').value = staffToActOn.noPassport;
        document.getElementById('jabatan').value = staffToActOn.jabatan;
        document.getElementById('tempat-lahir').value = staffToActOn.tempatLahir;
        document.getElementById('tanggal-lahir').value = staffToActOn.tanggalLahir;
        document.getElementById('jenis-kelamin').value = staffToActOn.jenisKelamin;
        document.getElementById('kamar-mess').value = staffToActOn.kamarMess;
        document.getElementById('tgl-gabung-smb').value = staffToActOn.tglGabungSmb;
        document.getElementById('join-togelup').value = staffToActOn.joinTogelup;
        document.getElementById('jam-kerja').value = staffToActOn.jamKerja;
        document.getElementById('admin-idn').value = staffToActOn.adminIdn;
        document.getElementById('admin-power').value = staffToActOn.adminPower;
        document.getElementById('email-kerja').value = staffToActOn.emailKerja;
        modalTitle.textContent = 'Edit Data Staff';
        staffFormModal.style.display = 'flex';
    }
});
tableBody.addEventListener('click', (event) => {
    const target = event.target.closest('button');
    if (!target) return;
    const errorId = parseInt(target.dataset.id);
    const errors = getStoredErrors();
    const errorToActOn = errors.find(err => err.id === errorId);
    if (!errorToActOn) return;

    if (target.classList.contains('btn-view-error')) {
        openErrorViewModal(errorToActOn);
    } else if (target.classList.contains('btn-delete-error')) {
        if (confirm('Apakah Anda yakin ingin menghapus data kesalahan ini?')) {
            const updatedErrors = errors.filter(err => err.id !== errorId);
            saveErrorsList(updatedErrors);
            updateDashboard();
            if (pageBoxNama.style.display === 'block') { renderStaffSummary(); }
        }
    }
});
exportExcelBtn.addEventListener('click', exportToExcel);

// --- BAGIAN 5: INISIALISASI APLIKASI ---
showPage('kesalahan');