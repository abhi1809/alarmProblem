import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {Observable} from 'rxjs';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';

@Component({    
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'sampleapp';
  public startTime;
  public endTime;
  public eventDurationTime;
  public totalDuration;
  public maxTemperatureThreshold;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.getJSON().subscribe(data => {
      this.calculateUploadEventsDuration(data);
      this.calculateTotalTime(data);
    });
  }

  public getJSON(): Observable<any> {
      return this.http.get("assets/data.json")
                  .map((res:any) => res)
  }

  calculateUploadEventsDuration(data) {
    this.startTime = data.startTime;
    this.endTime = data.endTime;

    let maxAlarmIn = data.tripUploadEvents.filter(event => event.eventType == 8);
    let maxAlarmOut = data.tripUploadEvents.filter(event => event.eventType == 6);
    
    // sorting the arrays in ascending order based on timestamp if there are multiple events
    maxAlarmIn = maxAlarmIn.sort(function(a,b) {
      return Number(new Date(b.timestamp)) - Number(new Date(a.timestamp))
    }).reverse()

    maxAlarmOut = maxAlarmOut.sort(function(a,b) {
      return Number(new Date(b.timestamp)) - Number(new Date(a.timestamp))
    }).reverse()

    let maxAlarmInTime = new Date(maxAlarmIn[maxAlarmIn.length-1].timestamp).getTime() //get the max date
    let maxAlarmOutTime = new Date(maxAlarmOut[0].timestamp).getTime() //get the min date
    
    this.eventDurationTime = (maxAlarmInTime - maxAlarmOutTime)/1000
  }

  calculateTotalTime(data){
    let tripSettingsTemperature = data.tripSettings.filter(tripSettingObj => tripSettingObj.dataType == "Temperature");
    this.maxTemperatureThreshold = tripSettingsTemperature[0].max;

    let sensor2Data = data.tripUploadData.filter(data => data.channel == "sensor2");

    sensor2Data = sensor2Data.sort(function(a,b) {
      return Number(new Date(b.timestamp)) - Number(new Date(a.timestamp))
    }).reverse()

    let timeAtOverTemp; // purple pins
    let timeAtUnderTemp; // yellow pins
    let lastSegmentTime;
    let alarmTime = 0;

    sensor2Data.forEach((tripData) => {
      if(tripData.data > this.maxTemperatureThreshold){
        if(timeAtOverTemp == undefined) {
          timeAtOverTemp = tripData.timestamp;
        }
      } else {
        if(timeAtUnderTemp == undefined && timeAtOverTemp != undefined) {
          timeAtUnderTemp = tripData.timestamp;
          alarmTime = alarmTime + ((new Date(timeAtUnderTemp).getTime() - new Date(timeAtOverTemp).getTime()) / 1000);
          timeAtOverTemp = undefined;
          timeAtUnderTemp = undefined;
        }
      }
    });

    if(timeAtOverTemp != undefined && timeAtUnderTemp == undefined) {
      lastSegmentTime = (new Date(data.endTime).getTime() - new Date(timeAtOverTemp).getTime()) / 1000
    }

    let sum = alarmTime + lastSegmentTime + this.eventDurationTime

    // Convert seconds to HH:MM:SS
    let hours = Math.floor(sum / 3600);
    sum %= 3600;
    let minutes = Math.floor(sum / 60);
    let seconds = sum % 60;

    this.totalDuration = hours + ":" + minutes + ":" + seconds
  }

}
