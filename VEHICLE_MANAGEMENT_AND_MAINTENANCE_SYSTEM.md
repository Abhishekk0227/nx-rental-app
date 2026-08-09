# Vehicle Management, KM Billing, and Maintenance System

## 1. Overview
This document explains how the current `carRental` app handles:
- vehicle management logic
- vehicle kilometre (KM) usage calculation
- maintenance status flow
- current limitations and upgrades for a proper maintenance system

Relevant files:
- `client/src/components/VehicleManagement.jsx`
- `client/src/components/AvailableVehicles.jsx`
- `client/src/components/BookedVehicles.jsx`
- `client/src/App.jsx`
- `server/models/Vehicle.js`
- `server/routes/vehicles.js`

---

## 2. Vehicle Management Logic

### 2.1 Vehicle model structure
In `server/models/Vehicle.js`, each vehicle stores:
- `vehicleId`, `name`, `brand`, `regNumber`, `category`, `fuelType`
- `seatingCapacity`, `color`, `meterReading`, `fuelCapacity`, `mileage`
- `status`: one of `Available`, `Active`, `Reserved`, `Booked`, `Maintenance`, `Out Of Service`, `Inactive`, `Ongoing`
- `pricingPlans`: nested plans for `hourly`, `twelveHour`, `twentyFourHour`, `weekly`, `monthly`
- `depositSettings`, `paymentSettings`, `bookingConfig`
- `availability`: `{ availableForBooking, reason }`
- `maintenanceRecords`: array of service logs

### 2.2 Pricing plan fields
Each pricing plan contains rates and km settings:
- `hourly`: `rate`, `freeKm`, `fuelChargePerKm`, `extraKmCharge`, `withFuel`, `withoutFuel`
- `twelveHour`: `baseRate`, `ratePerHour`, `kmLimit`, `fuelChargePerKm`, `extraKmCharge`, `extraHourCharge`, `gracePeriod`, `withFuel`, `withoutFuel`
- `twentyFourHour`: similar to `twelveHour`
- `weekly`: `baseRate`, `kmLimit`, `extraKmCharge`, `extraDayCharge`, `gracePeriod`
- `monthly`: `baseRate`, `kmLimit`, `extraKmCharge`, `extraDayCharge`

### 2.3 Frontend vehicle edit flow
The admin/worker UI in `client/src/components/VehicleManagement.jsx`:
- loads a selected vehicle into `formData`
- allows editing vehicle details and pricing plans
- submits updates through `onUpdateVehicle(vehicleId, payload)`
- the payload is sent to `PUT /api/vehicles/:vehicleId` in `client/src/App.jsx`

`onUpdateVehicle` uses this update route with deep merge logic in `server/routes/vehicles.js`.

### 2.4 Status and Availability toggling
Current maintenance or availability changes are handled in two places:
- `client/src/components/VehicleManagement.jsx` - availability modal
- `client/src/components/AvailableVehicles.jsx` - maintenance modal

They both use `handleAvailabilitySubmit` and map:
- if `availableForBooking` is `true`, set `status = 'Active'`
- if `availableForBooking` is `false`, set `status = reason` or `Maintenance`

The request is sent to `PATCH /api/vehicles/:vehicleId/status`.

### 2.5 Server-side status route
In `server/routes/vehicles.js`:
- `PATCH /api/vehicles/:vehicleId/status`
- updates `vehicle.status`
- updates `vehicle.availability` accordingly:
  - `availableForBooking: status === 'Active' || status === 'Available'`
  - `reason` from request body

This means the current maintenance system is essentially a status toggle.

---

## 3. KM Calculation and Usage

### 3.1 KM source values
Booking km is driven from `client/src/components/BookedVehicles.jsx` in the return settlement logic.
Key fields:
- `startMeter`: `selectedBooking.pickupDetails?.odometerStart` or `handover?.startMeter`
- `endMeter`: `dropEndMeter` input or return meter reading
- `totalKmUsed = Math.max(0, endMeter - startMeter)`

### 3.2 Rounding rule
The app uses a custom rounding rule:
- if decimal part `<= 0.5`, round down
- if decimal part `> 0.5`, round up
This is applied to km values when computing billed kilometers.

### 3.3 Extra km calculation
The billing logic determines km limits and overage charges as follows:
- `freeKmLimit` is taken from `selectedBooking.selectedPlan?.kmLimit`
- if no km limit exists, fallback is `Math.round(120 * (bookedDurationHours / 24))`

For standard vehicles:
- `allowedKmLimit = Math.max(freeKmLimit, actualHoursDecimal * 10)`
- `allowedKmLimitRounded = customRoundKm(allowedKmLimit)`
- `freeKmLimitTotal = allowedKmLimit + Number(dropAddFreeKm || 0)`
- `extraKm = Math.max(0, totalKmUsed - freeKmLimitTotal)`
- `extraKmRounded = customRoundKm(extraKm)`
- `extraKmCharge = extraKmRounded * extraKmRate`

### 3.4 Extra km rate resolution
`extraKmRate` is resolved in this priority:
1. `selectedBooking.selectedPlan?.extraKmCharge`
2. live vehicle pricing plan `activeVehiclePlan.extraKmCharge`
3. fallback default by category: car = 12, bike = 8, otherwise 5

### 3.5 Scooty-with-fuel special case
For scooty bookings with fuel included:
- the app does not use a normal allowed km limit
- every km is charged at `fuelChargePerKm`
- `distanceCharge = totalKmUsedRounded * fuelChargePerKm`
- extra km charge is effectively replaced by per-km fuel charge

### 3.6 Time-based extra charge
The app also computes extra time charges:
- `bookedDurationHours` from saved booking or expected rental period
- actual time difference from pickup to return
- extra minutes = actual minutes - booked minutes
- free extra minutes are subtracted by `dropFreeMinutes`
- `extraHourRate` uses:
  - live vehicle pricing if available
  - booking plan values
  - defaults based on category

For scooty with fuel and hourly plan:
- `chargeableHoursForFuel = Math.max(1, Math.ceil(actualHoursDecimal))`
- base cost uses `withFuel` hourly rate

### 3.7 Final settlement formula
For standard vehicles:
- `actualRentalBill = currentRentalCost + extraHourCharge + extraKmCharge + manualChargesTotal + accessoryChargeTotal - waiverDiscount`

For scooty + fuel:
- `actualRentalBill = baseHourlyCost + distanceCharge + manualChargesTotal + accessoryChargeTotal - waiverDiscount`

The final settlement then computes:
- `remainingCollection`
- `depositAdjustment`
- `depositRefund`
- status: `Collect`, `Refund`, or `Settled`

---

## 4. Current Maintenance System Behavior

### 4.1 What exists now
The current system supports:
- marking a vehicle unavailable for booking
- selecting a reason: `Maintenance`, `Accident`, `Reserved`, `Out Of Service`
- syncing those values to the server via a dedicated status endpoint
- filtering vehicles by status in lists

### 4.2 What does not exist yet
Currently, the system does not appear to support:
- adding or editing `maintenanceRecords` from the UI
- logging service cost, next due date, or notes in a dedicated maintenance history screen
- automatically scheduling future maintenance based on km or dates
- using `maintenanceRecords` to decide maintenance due status

The `maintenanceRecords` field exists in the `Vehicle` model, but the current UI only initializes it as an empty array and does not add entries.

### 4.3 Current UX flow
From `AvailableVehicles.jsx` and `VehicleManagement.jsx`:
- open vehicle details
- switch to availability/maintenance panel
- choose `Available For Booking` = Yes/No
- if No, choose a blockage reason
- submit and update status

This is the present maintenance workflow in the app.

---

## 5. Recommended Maintenance System Design

For a proper maintenance system, implement these elements:

### 5.1 Vehicle maintenance status
- add a dedicated maintenance dashboard
- show vehicles currently in `Maintenance`, `Out Of Service`, or `Inactive`
- allow quick status updates from vehicle list

### 5.2 Maintenance service log
Use `maintenanceRecords` as a real history log with:
- `serviceDate`
- `cost`
- `nextDue`
- `notes`
- optionally `serviceType` and `vendor`

### 5.3 KM-based maintenance triggers
Use vehicle km to schedule service:
- record odometer reading on each booking return
- compare current km to the vehicle’s last service km
- create alerts when vehicle reaches service interval, e.g. every 5,000 km

### 5.4 UI suggestions
Add UI controls for:
- `Add maintenance record`
- `Next service due` view
- `Maintenance history` tab per vehicle
- `Service cost summary` and `total spent`
- `Maintenance reason` separate from booking/blockage reason

### 5.5 Backend changes
- extend `PATCH /api/vehicles/:vehicleId/status` to optionally store a maintenance record
- add `POST /api/vehicles/:vehicleId/maintenance` to append a record
- return `maintenanceRecords` in vehicle GET responses
- compute a `nextServiceDue` field based on km or date

---

## 6. Practical Usage in the Current App

### 6.1 To mark a vehicle under maintenance
1. Open a vehicle in `VehicleManagement` or `AvailableVehicles`
2. Select `Available For Booking = No`
3. Pick `Maintenance` or another reason
4. Save

Result: the vehicle’s `status` becomes `Maintenance`, and `availability.availableForBooking` becomes `false`.

### 6.2 To calculate km charges during booking return
The booking return flow:
- reads `startMeter` from handover data
- reads input `endMeter` from drop-off form
- computes `totalKmUsed`
- applies rounding and overage logic
- shows extra km charge, fuel charge, and final bill

### 6.3 Why km is important for maintenance
- actual odometer values are needed for service scheduling
- extra km and `meterReading` tell you total vehicle usage
- if the app records vehicle km on every return, it can later drive maintenance alerts

---

## 7. Summary
The current vehicle logic is primarily:
- pricing plan configuration in `VehicleManagement.jsx`
- status toggling through availability/maintenance modals
- booking km billing inside `BookedVehicles.jsx`
- maintenance history is defined in the schema, but not yet fully used

To make the maintenance system proper, the app should:
- add dedicated maintenance records UI
- use `maintenanceRecords` for service logs
- connect odometer updates to maintenance triggers
- keep status and availability separate from service history

If you want, I can also create a second file with a proposed schema and UI flow for a full maintenance module.