import CalendrierView from "@/components/calendrier/CalendrierView";
import IframeResizer from "@/components/calendrier/IframeResizer";

export default function CalendrierPage() {
  return (
    <main className="px-3 py-4 w-full">
      <CalendrierView />
      <IframeResizer />
    </main>
  );
}
