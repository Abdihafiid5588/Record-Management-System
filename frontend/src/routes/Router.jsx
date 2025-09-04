import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "../pages/Dashboard";
// import AddRecord from "../pages/AddRecord";
// import RecordsList from "../pages/RecordsList";
// import RecordDetail from "../pages/RecordDetail";

export default function RouterConfig() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={<Dashboard />} />
        {/* <Route path="/add-record" element={<AddRecord />} />
        <Route path="/records" element={<RecordsList />} />
        <Route path="/records/:id" element={<RecordDetail />} /> */}
      </Routes>
    </BrowserRouter>
  );
}
