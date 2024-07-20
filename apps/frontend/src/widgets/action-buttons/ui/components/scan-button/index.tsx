import { useEffect } from "react";
import { Scan } from "../../icons/scan";

export function ScanButton() {
	const handleClick = () => {
		try {
			Telegram.WebApp.showScanQrPopup({
				text: "Try to scan",
			});
		} catch (error) {
			Telegram.WebApp.showAlert(
				"Unable to show QR-code scaner in this environment",
			);
		}
	};

    useEffect(() => {
        Telegram.WebApp.onEvent("qrTextReceived", (event) => {
			console.log({ event });
			Telegram.WebApp.sendData(event.data);
			Telegram.WebApp.closeScanQrPopup();
		});
    }, [])

	return (
		<button
			type="button"
			className="btn px-2 py-3 rounded bg-primary hover:cursor-pointer"
			onClick={handleClick}
		>
			<Scan />
		</button>
	);
}
