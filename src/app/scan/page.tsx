'use client';

import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { decodeQRCodeData, QRCodeData } from '@/lib/qr-generator';
import { CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ScanPage() {
  const [scanResult, setScanResult] = useState<QRCodeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    let scanner: Html5QrcodeScanner;
    
    if (isScanning) {
      scanner = new Html5QrcodeScanner(
        'reader',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scanner.render(
        (decodedText) => {
          // Thành công
          const data = decodeQRCodeData(decodedText);
          if (data) {
            setScanResult(data);
            setIsScanning(false);
            scanner.clear();
          } else {
            setError('Mã QR không hợp lệ hoặc không thuộc hệ thống này.');
          }
        },
        (err) => {
          // Bỏ qua lỗi trong quá trình quét liên tục
        }
      );
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(e => console.error(e));
      }
    };
  }, [isScanning]);

  const handleReset = () => {
    setScanResult(null);
    setError(null);
    setIsScanning(true);
  };

  const isCardValid = scanResult && new Date(scanResult.expiry) >= new Date();

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 bg-blue-700 text-white text-center font-bold tracking-wide">
          QUÉT THẺ RA VÀO
        </div>

        {isScanning ? (
          <div className="p-4 flex flex-col items-center">
            <div id="reader" className="w-full max-w-sm rounded overflow-hidden"></div>
            {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
          </div>
        ) : (
          <div className="p-6 flex flex-col items-center text-center space-y-4">
            {isCardValid ? (
              <CheckCircle2 className="w-20 h-20 text-green-500" />
            ) : (
              <XCircle className="w-20 h-20 text-red-500" />
            )}

            <h2 className={`text-2xl font-bold ${isCardValid ? 'text-green-600' : 'text-red-600'}`}>
              {isCardValid ? 'HỢP LỆ' : 'HẾT HẠN / KHÔNG HỢP LỆ'}
            </h2>

            {scanResult && (
              <div className="w-full bg-gray-50 p-4 rounded text-left space-y-2 mt-4 text-sm text-gray-700">
                <p><span className="font-semibold w-20 inline-block">Họ tên:</span> {scanResult.name}</p>
                <p><span className="font-semibold w-20 inline-block">MNV:</span> {scanResult.mnv}</p>
                <p><span className="font-semibold w-20 inline-block">Khu vực:</span> {scanResult.area}</p>
                {scanResult.vehicle_plate && (
                  <p><span className="font-semibold w-20 inline-block">Biển số:</span> <span className="font-bold">{scanResult.vehicle_plate}</span></p>
                )}
                <p><span className="font-semibold w-20 inline-block">Hạn thẻ:</span> {new Date(scanResult.expiry).toLocaleDateString('vi-VN')}</p>
              </div>
            )}

            <Button onClick={handleReset} className="w-full mt-6 bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="w-4 h-4 mr-2" /> Quét Thẻ Khác
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
