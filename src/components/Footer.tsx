import React from 'react';
import { MessageCircle } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-black py-12 mt-10">
      <div className="max-w-7xl mx-auto px-4 md:px-10 flex flex-col md:flex-row justify-between gap-10">
        <div className="flex flex-col space-y-4 max-w-xs">
          <div className="flex items-center space-x-2">
            <img src="https://i.imgur.com/1FXXaKE.jpeg" alt="Aashirwad Stores Logo" className="w-8 h-8 md:w-10 md:h-10 object-contain bg-white rounded-md p-1 -mt-1" />
            <span className="text-sm font-semibold text-white">Aashirwad Stores</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Your trusted neighborhood general store bringing premium quality daily essentials right to your WhatsApp.
          </p>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">
            © {new Date().getFullYear()} Aashirwad Stores
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-10">
          <div className="flex flex-col space-y-3">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Quick Links</span>
            <ul className="flex flex-col space-y-2">
              <li><a href="#" className="text-xs text-gray-300 font-medium hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="text-xs text-gray-300 font-medium hover:text-white transition-colors">Shipping & Returns</a></li>
              <li><a href="#" className="text-xs text-gray-300 font-medium hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-xs text-gray-300 font-medium hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>

          <div className="flex flex-col space-y-3">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Contact Us</span>
            <ul className="flex flex-col space-y-2">
              <li className="text-xs text-gray-300 font-medium">
                <a 
                  href="https://maps.app.goo.gl/kWa5AxaXn8zVQ8at5?g_st=ac" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors hover:underline cursor-pointer"
                >
                  Aashirwad General Stores<br/>
                  Near Maharashtra Bank<br/>
                  Railway Station Road, Pachora
                </a>
              </li>
              <li className="text-xs text-gray-300 font-medium">+91 9028646863</li>
              <li className="pt-2">
                <a 
                  href="https://wa.me/919028646863" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-brand-whatsapp text-white hover:bg-brand-green-hover rounded-full font-bold text-xs transition-colors"
                >
                  <MessageCircle size={14} />
                  <span>Chat on WhatsApp</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
