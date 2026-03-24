import { useAuction } from "@/context/AuctionContext";
import LoginScreen from "@/pages/LoginScreen";
import LobbyScreen from "@/pages/LobbyScreen";
import AuctionRoom from "@/pages/AuctionRoom";
import EndScreen from "@/pages/EndScreen";

const Index = () => {
  const { state } = useAuction();

  switch (state.phase) {
    case "login":
      return <LoginScreen />;
    case "lobby":
      return <LobbyScreen />;
    case "auction":
      return <AuctionRoom />;
    case "end":
      return <EndScreen />;
    default:
      return <LoginScreen />;
  }
};

export default Index;
