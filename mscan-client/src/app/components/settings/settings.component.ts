import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent {
  settings = {
    systemName: 'MSCAN',
    version: '1.0.0',
    emailNotifications: true,
    smsNotifications: false,
    autoApproveCredits: false,
    maxCreditLimit: 10000,
    sessionTimeout: 30,
    maintenanceMode: false
  };

  saveSettings() {
    // TODO: Implement API call to save settings
  }
}
