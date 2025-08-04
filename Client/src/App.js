import logo from './logo.svg';
import './App.css';
import Navbar from './components/Navbar';
import Converter from './components/Converter';
import Footer from "./components/Footer";
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';

function App() {
  return (
    <div className="App">
        <Navbar />
        <Converter />
    
        <ToastContainer />
        <Footer />
    </div>
  );
}

export default App;
