import React, { useState, useRef } from "react";
import CustomPeoplePicker from "./CustomPeoplePicker";
import "select2/dist/css/select2.css";
import './App.css'

const PEOPLE = [
  {
    id: "jane.doe@company.com",
    name: "Jane Doe",
    email: "jane.doe@company.com",
    image: "https://i.pravatar.cc/100?u=jane.doe@company.com",
  },
  {
    id: "john.smith@company.com",
    name: "John Smith",
    email: "john.smith@company.com",
    image: "https://i.pravatar.cc/100?u=john.smith@company.com",
  },
  {
    id: "ada.lovelace@company.com",
    name: "Ada Lovelace",
    email: "ada.lovelace@company.com",
    image: "https://i.pravatar.cc/100?u=ada.lovelace@company.com",
  },
  {
    id: "alan.turing@company.com",
    name: "Alan Turing",
    email: "alan.turing@company.com",
    // no image – will just show the name
  },
];
function App() {

  const [employee, setEmployee] = useState(null);
  const [supervisor, setSupervisor] = useState(null);
  const [reviewers, setReviewers] = useState([]);

  const employeeRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({
      employee,       // "jane.doe@company.com"  or null
      supervisor,     // string or null
      reviewers,      // ["id1", "id2"]
    });
  };



  return (
    <>
      <form onSubmit={handleSubmit} style={{ maxWidth: 480, fontFamily: "sans-serif" }}>
      <h2>Employee Form</h2>

      {/* -------- Single select -------- */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
          Employee *
        </label>
        <CustomPeoplePicker
          ref={employeeRef}
          options={PEOPLE}
          value={employee}
          onChange={setEmployee}
          placeholder="Search employee…"
        />
        <small style={{ color: "#666" }}>
          Selected: {employee || "—"}
        </small>
      </div>

      {/* -------- Another single select -------- */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
          Supervisor
        </label>
        <CustomPeoplePicker
          options={PEOPLE}
          value={supervisor}
          onChange={setSupervisor}
          placeholder="Search supervisor…"
        />
      </div>

      {/* -------- Multi select -------- */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
          Concurrent Reviewers
        </label>
        <CustomPeoplePicker
          options={PEOPLE}
          value={reviewers}
          onChange={(val) => setReviewers(val || [])}
          multiple
          preserveOrder
          placeholder="Select reviewers…"
        />
        <small style={{ color: "#666" }}>
          Selected: {reviewers.length ? reviewers.join(", ") : "—"}
        </small>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
        <button type="submit">Submit</button>
        <button
          type="button"
          onClick={() => {
            setEmployee(null);
            setSupervisor(null);
            setReviewers([]);
          }}
        >
          Clear all
        </button>
        <button
          type="button"
          onClick={() => employeeRef.current?.setValue("ada.lovelace@company.com")}
        >
          Set Employee via ref
        </button>
      </div>
    </form>
    </>
  )
}

export default App
