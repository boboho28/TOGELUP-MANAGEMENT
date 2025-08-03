import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function initializeApp(isViewer) {
    // --- BAGIAN 1: SELEKSI ELEMEN DOM ---
    const navKesalahan = document.getElementById('nav-kesalahan');
    const navBoxNama = document.getElementById('nav-boxnama');
    const navDataStaff = document.getElementById('nav-datastaff');
    const navTambah = document.getElementById('nav-tambah');
    const navLivechat = document.getElementById('nav-livechat');
    const navRekening = document.getElementById('nav-rekening');
    const pageKesalahan = document.getElementById('page-kesalahan');
    const pageBoxNama = document.getElementById('page-boxnama');
    const pageDataStaff = document.getElementById('page-datastaff');
    const pageTambah = document.getElementById('page-tambah');
    const pageLivechat = document.getElementById('page-livechat');
    const pageRekening = document.getElementById('page-rekening');
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
    const staffNameSearchEl = document.getElementById('staff-name-search');
    const livechatTableBody = document.getElementById('livechat-table-body');
    const showTotalErrorsBtn = document.getElementById('show-total-errors-btn');
    const totalErrorsModal = document.getElementById('total-errors-modal');
    const closeTotalErrorsModalBtn = document.querySelector('#total-errors-modal .modal-close');
    const totalErrorsTableBody = document.getElementById('total-errors-table-body');
    const boxNamaSearchEl = document.getElementById('box-nama-search');
    const errorsChartCanvas = document.getElementById('errors-chart');

    let staffErrorTotals = [];
    let errorsChart = null;

    // --- KONEKSI KE FIREBASE COLLECTIONS ---
    const errorsCollectionRef = collection(db, "kesalahan");
    const staffCollectionRef = collection(db, "staff");

    // --- BATASI UI UNTUK PENGGUNA VIEWER ---
    if (isViewer) {
        navTambah.style.display = 'none';
        clearButton.style.display = 'none';
        addStaffBtn.style.display = 'none';
        const prosesSimpanBtn = document.querySelector('#auto-parser-form button[type="submit"]');
        if (prosesSimpanBtn) {
            prosesSimpanBtn.style.display = 'none';
        }
    }

    // --- FUNGSI-FUNGSI UTAMA ---

    function normalizeStaffName(name) {
        if (!name || typeof name !== 'string') return '';
        return name.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    }

    function showPage(pageId) {
        [pageKesalahan, pageBoxNama, pageDataStaff, pageTambah, pageLivechat, pageRekening].forEach(p => p.style.display = 'none');
        [navKesalahan, navBoxNama, navDataStaff, navTambah, navLivechat, navRekening].forEach(n => n.classList.remove('active'));
        let pageToShow, navToActivate;
        switch (pageId) {
            case 'boxnama': pageToShow = pageBoxNama; navToActivate = navBoxNama; renderStaffSummary(); break;
            case 'datastaff': pageToShow = pageDataStaff; navToActivate = navDataStaff; renderStaffTable(); break;
            case 'livechat': pageToShow = pageLivechat; navToActivate = navLivechat; fetchAndRenderLivechatData(); break;
            case 'rekening': pageToShow = pageRekening; navToActivate = navRekening; renderErrorsChart(); break;
            case 'tambah': pageToShow = pageTambah; navToActivate = navTambah; break;
            default: pageToShow = pageKesalahan; navToActivate = navKesalahan; updateDashboard(); break;
        }
        pageToShow.style.display = 'block';
        navToActivate.classList.add('active');
    }

    async function fetchAndRenderLivechatData() {
        const googleSheetUrl = `https://docs.google.com/spreadsheets/d/e/2PACX-1vTx_JjCSDeqgGnDqT8oWbT_zcVOX2W8UMx1oG5aCsvKHzWxhXNdMGOWbK-v6jzK0twmiOM4LGpZuQzJ/pub?gid=593722510&single=true&output=csv&_=${new Date().getTime()}`;
        livechatTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Mengambil data...</td></tr>`;
        try {
            const response = await fetch(googleSheetUrl);
            if (!response.ok) throw new Error(`Gagal mengambil data. Status: ${response.status}.`);
            const csvText = await response.text();
            const allRows = csvText.trim().split('\n');

            // Bagian 1: Proses Tabel Log Kesalahan (Struktur Baru)
            livechatTableBody.innerHTML = "";
            let dataFound = false;
            let currentDate = "";
            const dataRows = allRows.slice(3);

            for (const rowText of dataRows) {
                if (rowText.trim() === '' || rowText.toUpperCase().startsWith(',,,')) continue;
                if (rowText.toUpperCase().includes('TOTAL')) break;
                const columns = rowText.split(',').map(col => col.trim().replace(/^"|"$/g, ''));
                const isDateRow = (columns[0] || '').trim() === '' && /^\d{2}\/\d{2}\/\d{4}$/.test((columns[1] || '').trim());
                if (isDateRow) {
                    currentDate = columns[1].trim();
                } else if (columns.length >= 4) {
                    const namaCS = (columns[0] || '').trim();
                    const link = (columns[2] || '').trim();
                    const jenisKesalahan = (columns[3] || '').trim();
                    if (namaCS || jenisKesalahan) {
                        dataFound = true;
                        livechatTableBody.innerHTML += `<tr><td>${currentDate}</td><td>${namaCS}</td><td><a href="${link}" target="_blank">${link}</a></td><td style="white-space: normal;">${jenisKesalahan}</td></tr>`;
                    }
                }
            }
            if (!dataFound) {
                livechatTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; font-style:italic;">Tidak ada data valid yang dapat ditampilkan.</td></tr>`;
            }

            // Bagian 2: Proses Tabel Total Kesalahan (Kolom H, I)
            staffErrorTotals = [];
            let totalsHeaderIndex = allRows.findIndex(row => row.toUpperCase().includes('NAMA STAFF') && row.toUpperCase().includes('TOTAL KESALAHAN'));
            if (totalsHeaderIndex !== -1) {
                const headerColumns = allRows[totalsHeaderIndex].split(',');
                const nameIndex = headerColumns.findIndex(h => h.toUpperCase().includes('NAMA STAFF'));
                const totalIndex = headerColumns.findIndex(h => h.toUpperCase().includes('TOTAL KESALAHAN'));
                if (nameIndex !== -1 && totalIndex !== -1) {
                    for (let i = totalsHeaderIndex + 1; i < allRows.length; i++) {
                        const rowText = allRows[i];
                        if (rowText.trim() === '' || rowText.toUpperCase().includes('TOTAL')) break;
                        const columns = rowText.split(',');
                        if (columns.length > Math.max(nameIndex, totalIndex)) {
                            const staffName = (columns[nameIndex] || '').trim().replace(/^"|"$/g, '');
                            const errorCount = (columns[totalIndex] || '').trim().replace(/^"|"$/g, '');
                            if (staffName && errorCount) {
                                staffErrorTotals.push({ name: staffName, count: errorCount });
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Gagal memproses data Google Sheet:", error);
            livechatTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: #ff4d4d;">Terjadi kesalahan. Periksa console log.</td></tr>`;
        }
    }

    function openTotalErrorsModal() {
        if (staffErrorTotals.length === 0) {
            totalErrorsTableBody.innerHTML = `<tr><td colspan="2" style="text-align:center; font-style:italic;">Data total kesalahan tidak ditemukan.</td></tr>`;
        } else {
            totalErrorsTableBody.innerHTML = "";
            staffErrorTotals.forEach(staff => {
                const row = `<tr><td>${staff.name}</td><td>${staff.count}</td></tr>`;
                totalErrorsTableBody.innerHTML += row;
            });
        }
        totalErrorsModal.style.display = 'flex';
    }

    function parseReportText(text) {
        const findValue = key => (new RegExp(`^${key}\\s*:\\s*(.*)$`, "im")).exec(text);
        let staffName = "Tidak Ditemukan";
        const staffMatch = findValue("Staff");
        if (staffMatch && staffMatch[1]) {
            staffName = normalizeStaffName(staffMatch[1].trim());
        }
        return {
            perihal: findValue("Perihal") ? findValue("Perihal")[1].trim() : "Tidak Ditemukan",
            staff: staffName,
            full_text: text
        };
    }

    async function getStoredErrors() {
        const data = await getDocs(query(errorsCollectionRef, orderBy('createdAt', 'desc')));
        return data.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
    }

    async function saveError(errorData) {
        await addDoc(errorsCollectionRef, { ...errorData, createdAt: serverTimestamp() });
    }

    async function deleteSingleError(errorId) {
        const errorDoc = doc(db, "kesalahan", errorId);
        await deleteDoc(errorDoc);
    }

    async function deleteAllErrors() {
        const errorsSnapshot = await getDocs(errorsCollectionRef);
        for (const docSnapshot of errorsSnapshot.docs) {
            await deleteDoc(docSnapshot.ref);
        }
    }

    async function updateDashboard() {
        const errors = await getStoredErrors();
        const fromDate = fromDateEl.value ? new Date(fromDateEl.value).setHours(0, 0, 0, 0) : null;
        const toDate = toDateEl.value ? new Date(toDateEl.value).setHours(23, 59, 59, 999) : null;
        const searchTerm = normalizeStaffName(employeeSearchEl.value.toLowerCase());
        let filteredErrors = errors.filter(e => {
            const errorTimestamp = e.createdAt?.toDate();
            if (!errorTimestamp) return false;
            const dateMatch = (!fromDate || errorTimestamp >= fromDate) && (!toDate || errorTimestamp <= toDate);
            const employeeMatch = (searchTerm === "" || (e.staff && normalizeStaffName(e.staff).toLowerCase().includes(searchTerm)));
            return dateMatch && employeeMatch;
        });
        const countDeposit = filteredErrors.filter(e => e.perihal.toLowerCase().includes("deposit")).length;
        const countWithdraw = filteredErrors.filter(e => e.perihal.toLowerCase().includes("withdraw")).length;
        const countLate = filteredErrors.filter(e => e.perihal.toLowerCase().includes("telat")).length;
        summaryCards.deposit.textContent = countDeposit;
        summaryCards.withdraw.textContent = countWithdraw;
        summaryCards.late.textContent = countLate;
        const categorizedCount = countDeposit + countWithdraw + countLate;
        summaryCards.other.textContent = filteredErrors.length - categorizedCount;
        tableBody.innerHTML = "";
        if (filteredErrors.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; font-style:italic;">Tidak ada data yang cocok dengan filter.</td></tr>`;
            return;
        }
        filteredErrors.forEach(err => {
            const deleteButtonHTML = !isViewer ? `<button class="btn btn-sm btn__danger btn-delete-error" data-id="${err.id}"><i class="bi bi-trash-fill"></i></button>` : '';
            const row = `<tr><td>${err.id.substring(0, 6)}...</td><td>${err.createdAt ? err.createdAt.toDate().toLocaleString("id-ID") : 'No date'}</td><td>${normalizeStaffName(err.staff)}</td><td>Staff</td><td>${err.perihal}</td><td><div class="button-wrapper" style="justify-content: center; margin: 0; gap: 10px;"><button class="btn btn-sm btn__view btn-view-error" data-id="${err.id}"><i class="bi bi-eye-fill"></i></button>${deleteButtonHTML}</div></td></tr>`;
            tableBody.innerHTML += row;
        });
    }

    function openErrorViewModal(error) {
        document.getElementById('error-view-modal-title').textContent = `Detail Laporan: ${error.perihal}`;
        document.getElementById('view-error-report').textContent = error.full_text;
        errorViewModal.style.display = 'flex';
    }

    async function renderStaffSummary() {
        const errors = await getStoredErrors();
        const staffData = {};
        errors.forEach(err => {
            const normalizedName = normalizeStaffName(err.staff);
            if (!staffData[normalizedName]) {
                staffData[normalizedName] = { deposit: 0, withdraw: 0, telat: 0 };
            }
            const perihal = err.perihal.toLowerCase();
            if (perihal.includes("deposit")) staffData[normalizedName].deposit++;
            else if (perihal.includes("withdraw")) staffData[normalizedName].withdraw++;
            else if (perihal.includes("telat")) staffData[normalizedName].telat++;
        });
        const searchTerm = boxNamaSearchEl.value.toLowerCase();
        const staffNames = Object.keys(staffData).filter(name => name.toLowerCase().includes(searchTerm)).sort();
        staffSummaryContainer.innerHTML = "";
        if (staffNames.length === 0) {
            staffSummaryContainer.innerHTML = '<p style="text-align:center; font-style:italic;">Tidak ada data staff yang cocok dengan pencarian.</p>';
            return;
        }
        staffNames.forEach(name => {
            const data = staffData[name];
            const staffBoxHTML = `<div class="staff-box"><div class="staff-box-header">${name}</div><div class="staff-box-categories"><div class="category-item">Deposit</div><div class="category-item">Withdraw</div><div class="category-item">Telat</div></div><div class="staff-box-counts"><div class="count-item">${data.deposit}</div><div class="count-item">${data.withdraw}</div><div class="count-item">${data.telat}</div></div></div>`;
            staffSummaryContainer.innerHTML += staffBoxHTML;
        });
    }
    
    async function getStoredStaff() {
        const data = await getDocs(staffCollectionRef);
        return data.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
    }
    
    async function saveStaff(staffData, staffId) {
        if (staffId) {
            const staffDoc = doc(db, "staff", staffId);
            await updateDoc(staffDoc, staffData);
        } else {
            await addDoc(staffCollectionRef, { ...staffData, createdAt: serverTimestamp() });
        }
    }

    async function deleteSingleStaff(staffId) {
        const staffDoc = doc(db, "staff", staffId);
        await deleteDoc(staffDoc);
    }
    
    function parseDate(dateString) { if (!dateString || typeof dateString !== 'string') return null; let date; if (dateString.includes('-')) { const parts = dateString.split('-'); if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return null; date = new Date(parts[0], parts[1] - 1, parts[2]); } else if (dateString.includes('/')) { const parts = dateString.split('/'); if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return null; date = new Date(parts[2], parts[1] - 1, parts[0]); } else { return null; } return isNaN(date.getTime()) ? null : date; }
    
    function calculateAge(birthDateString) { const birthDate = parseDate(birthDateString); if (!birthDate) return null; const today = new Date(); let age = today.getFullYear() - birthDate.getFullYear(); const monthDifference = today.getMonth() - birthDate.getMonth(); if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) { age--; } return age; }
    
    function calculateTenure(joinDateString) { const joinDate = parseDate(joinDateString); if (!joinDate) return ''; const today = new Date(); let years = today.getFullYear() - joinDate.getFullYear(); let months = today.getMonth() - joinDate.getMonth(); if (months < 0) { years--; months += 12; } return `${years} Tahun, ${months} Bulan`; }
    
    async function renderStaffTable() {
        staffTableBody.innerHTML = '';
        let staffList = await getStoredStaff();
        const searchTerm = staffNameSearchEl.value.toLowerCase();
        if (searchTerm) {
            staffList = staffList.filter(staff =>
                staff.namaStaff && staff.namaStaff.toLowerCase().includes(searchTerm)
            );
        }
        const jabatanOrder = { 'CS': 1, 'KAPTEN': 2, 'KASIR': 3 };
        staffList.sort((a, b) => {
            const jabatanA = a.jabatan?.toUpperCase() || 'ZZZ';
            const jabatanB = b.jabatan?.toUpperCase() || 'ZZZ';
            const priorityA = jabatanOrder[jabatanA] || 99;
            const priorityB = jabatanOrder[jabatanB] || 99;
            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            } else {
                const timeA = a.createdAt?.toMillis() || 0;
                const timeB = b.createdAt?.toMillis() || 0;
                return timeA - timeB;
            }
        });
        if (staffList.length === 0) {
            staffTableBody.innerHTML = `<tr><td colspan="10" style="text-align:center; font-style:italic;">Tidak ada data staff yang cocok.</td></tr>`;
            return;
        }
        let lastJabatan = null;
        staffList.forEach((staff, index) => {
            const currentJabatan = staff.jabatan || 'Lain-lain';
            if (index > 0 && currentJabatan !== lastJabatan) {
                const separatorRow = `<tr class="jabatan-separator"><td colspan="10"></td></tr>`;
                staffTableBody.innerHTML += separatorRow;
            }
            let usia = ''; const calculatedAge = calculateAge(staff.tanggalLahir); if (calculatedAge !== null && calculatedAge >= 0) { usia = `${calculatedAge} TAHUN`; }
            const actionButtonsHTML = !isViewer ? `<button class="btn btn-sm btn__info btn-edit" data-id="${staff.id}"><i class="bi bi-pencil-fill"></i></button><button class="btn btn-sm btn__danger btn-delete" data-id="${staff.id}"><i class="bi bi-trash-fill"></i></button>` : '';
            const row = `<tr><td>${index + 1}</td><td>${staff.namaStaff || ''}</td><td>${staff.noPassport || ''}</td><td>${staff.jabatan || ''}</td><td>${staff.tempatLahir || ''}</td><td>${staff.tanggalLahir || ''}</td><td>${usia}</td><td>${staff.emailKerja || ''}</td><td>${staff.adminIdn || ''}</td><td><div class="button-wrapper" style="justify-content: flex-start; margin: 0; gap: 5px;"><button class="btn btn-sm btn__view btn-view-staff" data-id="${staff.id}"><i class="bi bi-eye-fill"></i></button>${actionButtonsHTML}</div></td></tr>`;
            staffTableBody.innerHTML += row;
            lastJabatan = currentJabatan;
        });
    }

    function openViewModal(staff) {
        document.getElementById('view-modal-title').textContent = `Lihat Data Staff: ${staff.namaStaff || ''}`;
        document.getElementById('view-nama-staff').textContent = staff.namaStaff || '-';
        document.getElementById('view-no-passport').textContent = staff.noPassport || '-';
        document.getElementById('view-jabatan').textContent = staff.jabatan || '-';
        document.getElementById('view-tempat-lahir').textContent = staff.tempatLahir || '-';
        document.getElementById('view-tanggal-lahir').textContent = staff.tanggalLahir || '-';
        const age = calculateAge(staff.tanggalLahir);
        document.getElementById('view-usia').textContent = age !== null ? `${age} TAHUN` : '-';
        document.getElementById('view-jenis-kelamin').textContent = staff.jenisKelamin || '-';
        document.getElementById('view-kamar-mess').textContent = staff.kamarMess || '-';
        document.getElementById('view-tgl-gabung-smb').textContent = staff.tglGabungSmb || '-';
        document.getElementById('view-masa-kerja').textContent = calculateTenure(staff.tglGabungSmb) || '-';
        document.getElementById('view-join-togelup').textContent = staff.joinTogelup || '-';
        document.getElementById('view-jam-kerja').textContent = staff.jamKerja || '-';
        document.getElementById('view-admin-idn').textContent = staff.adminIdn || '-';
        document.getElementById('view-admin-power').textContent = staff.adminPower || '-';
        document.getElementById('view-email-kerja').textContent = staff.emailKerja || '-';
        staffViewModal.style.display = 'flex';
    }
    
    async function exportToExcel() {
        const staffList = await getStoredStaff();
        if (staffList.length === 0) { alert("Tidak ada data staff untuk di-export."); return; }
        const dataToExport = staffList.map((staff, index) => ({ 'NO': index + 1, 'NAMA STAFF': staff.namaStaff || '', 'No Passport': staff.noPassport || '', 'JABATAN': staff.jabatan || '' }));
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data Staff");
        XLSX.writeFile(workbook, "Data_Staff.xlsx");
    }

    function renderErrorsChart() {
        try {
            if (errorsChart) {
                errorsChart.destroy();
            }
            if (staffErrorTotals.length === 0) {
                const ctx = errorsChartCanvas.getContext('2d');
                ctx.clearRect(0, 0, errorsChartCanvas.width, errorsChartCanvas.height);
                ctx.fillStyle = 'hsl(144 50 94 / 70%)';
                ctx.textAlign = 'center';
                ctx.font = "16px 'Raleway', sans-serif";
                ctx.fillText("Data belum dimuat. Silakan buka tab 'CS LIVECHAT' terlebih dahulu untuk memuat data.", errorsChartCanvas.width / 2, 50);
                return;
            }
            const sortedData = [...staffErrorTotals].sort((a, b) => parseInt(b.count) - parseInt(a.count));
            const chartLabels = sortedData.map(item => item.name);
            const chartData = sortedData.map(item => parseInt(item.count));
            const maxErrors = Math.max(...chartData);
            const minErrors = Math.min(...chartData);
            const backgroundColors = chartData.map(count => {
                if (count === maxErrors) return 'hsla(0, 70%, 50%, 0.7)';
                if (count === minErrors) return 'hsla(144, 70%, 40%, 0.7)';
                return 'hsla(220, 50%, 50%, 0.7)';
            });
            const borderColors = chartData.map(count => {
                if (count === maxErrors) return 'hsl(0, 70%, 50%)';
                if (count === minErrors) return 'hsl(144, 70%, 40%)';
                return 'hsl(220, 50%, 50%)';
            });
            const ctx = errorsChartCanvas.getContext('2d');
            errorsChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: chartLabels,
                    datasets: [{
                        label: 'Total Kesalahan',
                        data: chartData,
                        backgroundColor: backgroundColors,
                        borderColor: borderColors,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    scales: {
                        y: { beginAtZero: true, ticks: { color: 'hsl(144 50 94 / 70%)' } },
                        x: { ticks: { color: 'hsl(144 50 94 / 70%)' } }
                    },
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: 'Total Kesalahan per Staff', color: '#fff', font: { size: 18 } }
                    }
                }
            });
        } catch (err) {
            console.error("Gagal membuat grafik:", err);
        }
    }

    // --- BAGIAN 4: EVENT LISTENERS ---
    [navKesalahan, navBoxNama, navDataStaff, navTambah, navLivechat, navRekening].forEach(nav => nav.addEventListener('click', (e) => {
        e.preventDefault();
        showPage(nav.id.split('-')[1]);
    }));
    
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (isViewer) return;
        const inputText = reportInput.value;
        if (inputText.trim() === "") return;
        const newError = parseReportText(inputText);
        await saveError(newError);
        messageArea.innerHTML = '<p style="color: #4CAF50; text-align:center;">Berhasil!</p>';
        form.reset();
        setTimeout(() => { messageArea.innerHTML = ""; showPage('kesalahan'); }, 1500);
    });

    clearButton.addEventListener('click', async () => {
        if (isViewer) return;
        if (confirm('APAKAH ANDA YAKIN? Semua data KESALAHAN akan dihapus permanen.')) {
            await deleteAllErrors();
            updateDashboard();
            if (pageBoxNama.style.display === "block") { renderStaffSummary(); }
        }
    });

    [fromDateEl, toDateEl, employeeSearchEl].forEach(el => el.addEventListener('input', updateDashboard));
    staffNameSearchEl.addEventListener('input', renderStaffTable);
    boxNamaSearchEl.addEventListener('input', renderStaffSummary);
    livechatSearchEl.addEventListener('input', () => {
        fetchAndRenderLivechatData(livechatSearchEl.value);
    });
    addStaffBtn.addEventListener('click', () => { if(isViewer) return; staffForm.reset(); document.getElementById('staff-id').value = ''; modalTitle.textContent = 'Tambah Staff Baru'; staffFormModal.style.display = 'flex'; });
    
    closeFormModalBtn.addEventListener('click', () => { staffFormModal.style.display = 'none'; });
    closeViewModalBtn.addEventListener('click', () => { staffViewModal.style.display = 'none'; });
    closeErrorViewModalBtn.addEventListener('click', () => { errorViewModal.style.display = 'none'; });
    closeTotalErrorsModalBtn.addEventListener('click', () => { totalErrorsModal.style.display = 'none'; });
    
    window.addEventListener('click', (event) => {
        if (event.target == staffFormModal) { staffFormModal.style.display = 'none'; }
        if (event.target == staffViewModal) { staffViewModal.style.display = 'none'; }
        if (event.target == errorViewModal) { errorViewModal.style.display = 'none'; }
        if (event.target == totalErrorsModal) { totalErrorsModal.style.display = 'none'; }
    });

    showTotalErrorsBtn.addEventListener('click', openTotalErrorsModal);

    staffForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (isViewer) return;
        const staffId = document.getElementById('staff-id').value;
        const staffData = {
            namaStaff: document.getElementById('nama-staff').value, noPassport: document.getElementById('no-passport').value,
            jabatan: document.getElementById('jabatan').value, tempatLahir: document.getElementById('tempat-lahir').value,
            tanggalLahir: document.getElementById('tanggal-lahir').value, jenisKelamin: document.getElementById('jenis-kelamin').value,
            kamarMess: document.getElementById('kamar-mess').value, tglGabungSmb: document.getElementById('tgl-gabung-smb').value,
            joinTogelup: document.getElementById('join-togelup').value, jamKerja: document.getElementById('jam-kerja').value,
            adminIdn: document.getElementById('admin-idn').value, adminPower: document.getElementById('admin-power').value,
            emailKerja: document.getElementById('email-kerja').value,
        };
        await saveStaff(staffData, staffId);
        renderStaffTable();
        staffFormModal.style.display = 'none';
    });
    
    staffTableBody.addEventListener('click', async (event) => {
        const target = event.target.closest('button');
        if (!target) return;
        const id = target.dataset.id;
        const staffList = await getStoredStaff();
        const staffToActOn = staffList.find(s => s.id === id);
        if (!staffToActOn) return;

        if (target.classList.contains('btn-view-staff')) {
            openViewModal(staffToActOn);
        } else if (target.classList.contains('btn-delete')) {
            if (isViewer) return;
            if (confirm('Apakah Anda yakin ingin menghapus data staff ini?')) {
                await deleteSingleStaff(id);
                renderStaffTable();
            }
        } else if (target.classList.contains('btn-edit')) {
            if (isViewer) return;
            modalTitle.textContent = 'Edit Data Staff';
            document.getElementById('staff-id').value = staffToActOn.id;
            document.getElementById('nama-staff').value = staffToActOn.namaStaff || '';
            document.getElementById('no-passport').value = staffToActOn.noPassport || '';
            document.getElementById('jabatan').value = staffToActOn.jabatan || '';
            document.getElementById('tempat-lahir').value = staffToActOn.tempatLahir || '';
            document.getElementById('tanggal-lahir').value = staffToActOn.tanggalLahir || '';
            document.getElementById('jenis-kelamin').value = staffToActOn.jenisKelamin || 'Laki-laki';
            document.getElementById('kamar-mess').value = staffToActOn.kamarMess || '';
            document.getElementById('tgl-gabung-smb').value = staffToActOn.tglGabungSmb || '';
            document.getElementById('join-togelup').value = staffToActOn.joinTogelup || '';
            document.getElementById('jam-kerja').value = staffToActOn.jamKerja || '';
            document.getElementById('admin-idn').value = staffToActOn.adminIdn || '';
            document.getElementById('admin-power').value = staffToActOn.adminPower || '';
            document.getElementById('email-kerja').value = staffToActOn.emailKerja || '';
            staffFormModal.style.display = 'flex';
        }
    });

    tableBody.addEventListener('click', async (event) => {
        const target = event.target.closest('button');
        if (!target) return;
        const errorId = target.dataset.id;
        const errors = await getStoredErrors();
        const errorToActOn = errors.find(err => err.id === errorId);
        if (!errorToActOn) return;
        if (target.classList.contains('btn-view-error')) {
            openErrorViewModal(errorToActOn);
        } else if (target.classList.contains('btn-delete-error')) {
            if (isViewer) return;
            if (confirm('Apakah Anda yakin ingin menghapus data kesalahan ini?')) {
                await deleteSingleError(errorId);
                updateDashboard();
                if (pageBoxNama.style.display === 'block') { renderStaffSummary(); }
            }
        }
    });

    exportExcelBtn.addEventListener('click', exportToExcel);

    // --- INISIALISASI HALAMAN ---
    document.getElementById('app-loader').style.display = 'none';
    document.getElementById('app-content').style.display = 'block';
    showPage('kesalahan');
}

// --- PEMERIKSAAN AUTENTIKASI ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        const viewerEmails = [
            'ksbukdosup.smb01@gmail.com',
            'ksbukdosup.smb02@gmail.com',
            'ksbukdosup.smb03@gmail.com'
        ];
        const isViewer = user.email && viewerEmails.includes(user.email.toLowerCase());
        initializeApp(isViewer);
        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            signOut(auth);
        });
    } else {
        window.location.href = 'login.html';
    }
});
