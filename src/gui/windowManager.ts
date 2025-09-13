import { getNextWinId } from "@/utils";

interface AppWindow {
  id: string;
  title: string;
  isOpen: boolean;
  pos: { x: number; y: number };
  size: { width: number; height: number };
}

export class WindowManager {
  private activeWindows: Set<AppWindow>;

  constructor() {
    this.activeWindows = new Set();
  }

  createWindow(title: string): AppWindow {
    const id = getNextWinId().value;
    const newWindow: AppWindow = {
      id,
      title,
      isOpen: true,
      pos: { x: 100, y: 100 },
      size: { width: 300, height: 200 },
    };
    this.activeWindows.add(newWindow);

    const winElement = document.createElement("div");
    winElement.classList.add("window");
    winElement.style.width = newWindow.size.width + "px";
    winElement.style.height = newWindow.size.height + "px";
    winElement.style.left = newWindow.pos.x + "px";
    winElement.style.top = newWindow.pos.y + "px";
    const headerElement = document.createElement("div");
    headerElement.classList.add("window-header");
    headerElement.innerText = newWindow.title;
    winElement.appendChild(headerElement);

    document.body.appendChild(winElement);

    headerElement.addEventListener("mousedown", (e) => this.handlePointerDown(e, newWindow, headerElement));

    return newWindow;
  }

  destroyWindow(id: string): void {
    for (const win of this.activeWindows) {
      if (win.id === id) {
        this.activeWindows.delete(win);
        break;
      }
    }
  }

  openWindow(id: string): void {
    for (const win of this.activeWindows) {
      if (win.id === id) {
        win.isOpen = true;
        break;
      }
    }
  }

  closeWindow(id: string): void {
    for (const win of this.activeWindows) {
      if (win.id === id) {
        win.isOpen = false;
        break;
      }
    }
  }

  private handlePointerDown(event: MouseEvent, win: AppWindow, headerElement: HTMLElement) {
    event.preventDefault();
    const rect = headerElement.getBoundingClientRect();
    console.log("Header rect:", rect); // Debugging line
  }

  private handlePointerMove(event: MouseEvent, win: AppWindow, offsetX: number, offsetY: number) {
    event.preventDefault();
    win.pos.x = event.clientX - offsetX;
    win.pos.y = event.clientY - offsetY;

    const winElement = document.querySelector(`.window[data-id='${win.id}']`) as HTMLElement;
    if (winElement) {
      winElement.style.left = win.pos.x + "px";
      winElement.style.top = win.pos.y + "px";
    }
  }
}
