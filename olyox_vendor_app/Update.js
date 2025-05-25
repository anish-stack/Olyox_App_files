import { View } from "react-native";
import AppUpdater from "./updater/AppUpdater";

export const AppWithUpdater = ({ children, apiUrl }) => {
    return (
      <View style={{ flex: 1 }}>
        {children}
        <AppUpdater 
          apiUrl={apiUrl || "http://192.168.1.11:3100/api/v1/admin/app-version/by-type/tiffin_vendor"} 
          onClose={() => console.log('Update modal closed')}
         
        />
      </View>
    );
  };