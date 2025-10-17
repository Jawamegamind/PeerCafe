"use client"

import * as React from 'react';
import { useParams } from 'next/navigation';
import Navbar from "../../../../_components/navbar";

export default function RestaurantDetailPage() {
    const { restaurantId } = useParams();

  return (
    <div>
      <Navbar />
      <h1>Restaurant Menu Detail Page</h1>
      <p>This is where the restaurant menu and details will be displayed for admins and they can add new items.</p>
      <p>
        <strong>Restaurant ID:</strong> {restaurantId}
      </p>
    </div>
  );
}