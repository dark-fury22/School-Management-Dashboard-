/* ------------------------------
   Role-Based Access Check
--------------------------------*/
const role = localStorage.getItem("role");

if(!role){
    window.location.href = "index.html";
}

/* ------------------------------
   Global Data
--------------------------------*/
let students = JSON.parse(localStorage.getItem("students")) || [];
let gradeSettings = [
    {min: 70, max: 100, grade: "A"},
    {min: 60, max: 69, grade: "B"},
    {min: 50, max: 59, grade: "C"},
    {min: 45, max: 49, grade: "D"},
    {min: 40, max: 44, grade: "E"},
    {min: 0, max: 39, grade: "F"}
];

/* ------------------------------
   Helper Functions
--------------------------------*/
function saveToStorage(){
    localStorage.setItem("students", JSON.stringify(students));
}

function getGrade(score){
    for(const g of gradeSettings){
        if(score >= g.min && score <= g.max) return g.grade;
    }
    return "F";
}

function gradeToPoint(grade){
    switch(grade){
        case "A": return 5;
        case "B": return 4;
        case "C": return 3;
        case "D": return 2;
        case "E": return 1;
        case "F": return 0;
        default: return 0;
    }
}

function calculateAverage(scores){
    let sum = 0;
    let count = 0;
    for(const subj in scores){
        sum += Number(scores[subj]);
        count++;
    }
    return count > 0 ? (sum/count).toFixed(2) : 0;
}

function calculateGPA(scores){
    let totalPoints = 0;
    let count = 0;
    for(const subj in scores){
        totalPoints += gradeToPoint(getGrade(scores[subj]));
        count++;
    }
    return count > 0 ? (totalPoints/count).toFixed(2) : 0;
}

function calculateCumulativeGPA(student){
    let total = 0, count = 0;
    for(const term in student.terms){
        total += Number(student.terms[term].gpa);
        count++;
    }
    return count > 0 ? (total/count).toFixed(2) : "0.00";
}

function getStatus(average){
    return average >= 45 ? "Pass" : "Fail";
}

function getPromotionStatus(cumulativeGPA){
    return cumulativeGPA >= 2.5 ? "Promoted" : "Repeated";
}

/* ------------------------------
   UI Logic
--------------------------------*/
function showSection(section){
    document.getElementById("studentsSection").style.display =
        section === "students" ? "block" : "none";
    document.getElementById("gradesSection").style.display =
        section === "grades" ? "block" : "none";
}

function logout(){
    localStorage.removeItem("role");
    window.location.href = "index.html";
}

/* ------------------------------
   Subject Management
--------------------------------*/
function addSubject(){
    const container = document.getElementById("subjectsContainer");
    const row = document.createElement("div");
    row.className = "subject-row";
    row.innerHTML = `
        <input type="text" class="subjectName" placeholder="Subject Name">
        <input type="number" class="subjectScore" placeholder="Score">
    `;
    container.appendChild(row);
}

/* ------------------------------
   Student CRUD
--------------------------------*/
function addStudent(){
    const name = document.getElementById("studentName").value.trim();
    if(!name){
        alert("Student name is required");
        return;
    }

    const term = document.getElementById("termSelect").value;
    const subjectRows = document.querySelectorAll(".subject-row");
    const scores = {};

    for(const row of subjectRows){
        const subject = row.querySelector(".subjectName").value.trim();
        const score = Number(row.querySelector(".subjectScore").value);

        if(!subject || isNaN(score)){
            alert("All subjects and scores are required");
            return;
        }

        if(score < 0 || score > 100){
            alert("Scores must be between 0 and 100");
            return;
        }

        if(scores[subject]){
            alert("Duplicate subject detected: " + subject);
            return;
        }

        scores[subject] = score;
    }

    let existingStudent = students.find(s => s.name === name);

    if(!existingStudent && students.some(s => s.name === name)){
        alert("Student already exists");
        return;
    }

    const average = calculateAverage(scores);
    const status = getStatus(average);
    const gpa = calculateGPA(scores);

    if(existingStudent){
        existingStudent.terms[term] = {scores, average, gpa, status};
    } else {
        students.push({
            name,
            terms: {
                [term]: {scores, average, gpa, status}
            }
        });
    }

    saveToStorage();
    applyFilters();
    document.getElementById("studentName").value = "";
    document.getElementById("subjectsContainer").innerHTML = `
        <div class="subject-row">
            <input type="text" class="subjectName" placeholder="Subject Name">
            <input type="number" class="subjectScore" placeholder="Score">
        </div>
    `;
}

/* ------------------------------
   Delete Student
--------------------------------*/
function deleteStudent(index){
    const confirmDelete = confirm("Are you sure you want to delete this student?");
    if(!confirmDelete) return;
    students.splice(index,1);
    saveToStorage();
    applyFilters();
}

/* ------------------------------
   Display Students + Ranking
--------------------------------*/
function displayStudents(filteredStudents = students){
    const table = document.getElementById("studentTable");
    table.innerHTML = "";

    const term = document.getElementById("termSelect").value;
    let rankedStudents = [];

    filteredStudents.forEach(student => {
        if(student.terms[term]){
            rankedStudents.push({
                name: student.name,
                ...student.terms[term]
            });
        }
    });

    rankedStudents.sort((a,b) => b.gpa - a.gpa);

    if(rankedStudents.length === 0){
        table.innerHTML = "<tr><td colspan='9'>No records for this term</td></tr>";
        return;
    }

    rankedStudents.forEach((student, index) => {
        let subjectsHTML = "";
        for(const subject in student.scores){
            subjectsHTML += `${subject}: ${student.scores[subject]} (Grade: ${getGrade(student.scores[subject])})<br>`;
        }

        const cumulativeGPA = calculateCumulativeGPA(students.find(s => s.name === student.name));
        const promotion = getPromotionStatus(cumulativeGPA);

        table.innerHTML += `
            <tr>
                <td>${student.name}</td>
                <td>${subjectsHTML}</td>
                <td>${student.average}</td>
                <td>${student.gpa}</td>
                <td>${cumulativeGPA}</td>
                <td>${index + 1}</td>
                <td class="${student.status === 'Pass' ? 'pass':'fail'}">${student.status}</td>
                <td>${promotion}</td>
                <td>
                    <button onclick="deleteStudent(${students.indexOf(students.find(s => s.name===student.name))})">Delete</button>
                    <button onclick="printReportCard('${student.name}')">Print</button>
                </td>
            </tr>
        `;
    });
}

/* ------------------------------
   Search / Filter / Sort
--------------------------------*/
function applyFilters(){
    let filtered = [...students];

    const searchValue = document.getElementById("searchInput").value.toLowerCase();
    const statusValue = document.getElementById("statusFilter").value;
    const sortValue = document.getElementById("sortOption").value;

    if(searchValue){
        filtered = filtered.filter(student => student.name.toLowerCase().includes(searchValue));
    }

    const term = document.getElementById("termSelect").value;
    if(statusValue !== "all"){
        filtered = filtered.filter(student => student.terms[term] && student.terms[term].status === statusValue);
    }

    switch(sortValue){
        case "nameAsc": filtered.sort((a,b)=> a.name.localeCompare(b.name)); break;
        case "nameDesc": filtered.sort((a,b)=> b.name.localeCompare(a.name)); break;
        case "avgAsc":
            filtered.sort((a,b)=> {
                let aAvg = a.terms[term]?.average || 0;
                let bAvg = b.terms[term]?.average || 0;
                return aAvg - bAvg;
            });
            break;
        case "avgDesc":
            filtered.sort((a,b)=> {
                let aAvg = a.terms[term]?.average || 0;
                let bAvg = b.terms[term]?.average || 0;
                return bAvg - aAvg;
            });
            break;
    }

    displayStudents(filtered);
}

/* ------------------------------
   Report Card Print
--------------------------------*/
function printReportCard(studentName){
    const student = students.find(s => s.name === studentName);

    let reportHTML = `<h2>Report Card</h2><h3>Name: ${student.name}</h3><hr>`;

    for(const term in student.terms){
        reportHTML += `<h4>${term}</h4>`;
        const termData = student.terms[term];
        for(const subject in termData.scores){
            reportHTML += `${subject}: ${termData.scores[subject]} (Grade: ${getGrade(termData.scores[subject])})<br>`;
        }
        reportHTML += `Average: ${termData.average}<br>GPA: ${termData.gpa}<br>Status: ${termData.status}<hr>`;
    }

    const cumulativeGPA = calculateCumulativeGPA(student);
    const promotion = getPromotionStatus(cumulativeGPA);

    reportHTML += `<h3>Cumulative GPA: ${cumulativeGPA}</h3><h3>Promotion Status: ${promotion}</h3>`;

    const newWindow = window.open("");
    newWindow.document.write(reportHTML);
    newWindow.print();
}

/* ------------------------------
   Grade Settings Section
--------------------------------*/
function addGradeRow(){
    const container = document.getElementById("gradeContainer");
    const row = document.createElement("div");
    row.className = "grade-row";
    row.innerHTML = `
        <input type="number" class="minScore" placeholder="Min Score">
        <input type="number" class="maxScore" placeholder="Max Score">
        <input type="text" class="gradeLetter" placeholder="Grade">
    `;
    container.appendChild(row);
}

function saveGradeSettings(){
    const rows = document.querySelectorAll(".grade-row");
    const newGrades = [];

    for(const row of rows){
        const min = Number(row.querySelector(".minScore").value);
        const max = Number(row.querySelector(".maxScore").value);
        const grade = row.querySelector(".gradeLetter").value.trim().toUpperCase();

        if(isNaN(min) || isNaN(max) || !grade){
            alert("All grade fields are required and valid");
            return;
        }

        if(min > max){
            alert("Min score cannot be greater than Max score");
            return;
        }

        newGrades.push({min, max, grade});
    }

    gradeSettings = newGrades;
    alert("Grade settings saved");
}

/* ------------------------------
   Initialize
--------------------------------*/
window.onload = function(){
    if(role === "teacher"){
        document.querySelector(".grade-settings-section").style.display = "none";
    }
    displayStudents();
};
