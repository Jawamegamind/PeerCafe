import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'

// Mock the Navbar to avoid heavy Next internals
jest.mock('../app/_components/navbar', () => {
  return function MockNavbar() {
    return React.createElement('div', null, 'Mock Navbar')
  }
})

// Mock next/navigation useRouter
const pushMock = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

import AdminOrdersPage from '../app/(main)/admin/orders/page'

describe('AdminOrdersPage actions', () => {
  beforeEach(() => {
    pushMock.mockClear()
    ;(global as any).fetch = jest.fn((input: RequestInfo, opts?: RequestInit) => {
      const url = String(input)

      // Initial list fetches
      if (url.endsWith('/orders') && (!opts || !opts.method)) {
        return Promise.resolve({ ok: true, json: async () => [
          {
            order_id: 'o-1',
            restaurant_id: 1,
            order_items: [],
            subtotal: 10,
            tax_amount: 0,
            delivery_fee: 0,
            tip_amount: 0,
            discount_amount: 0,
            total_amount: 10,
            status: 'pending',
            created_at: new Date().toISOString(),
            delivery_address: {},
          },
          {
            order_id: 'o-2',
            restaurant_id: 2,
            order_items: [],
            subtotal: 20,
            tax_amount: 0,
            delivery_fee: 0,
            tip_amount: 0,
            discount_amount: 0,
            total_amount: 20,
            status: 'confirmed',
            created_at: new Date().toISOString(),
            delivery_address: {},
          }
        ] })
      }

      if (url.endsWith('/restaurants')) {
        return Promise.resolve({ ok: true, json: async () => [ { restaurant_id: 1, name: 'R1' }, { restaurant_id: 2, name: 'R2' } ] })
      }

      // Patch status endpoint
      if (url.includes('/orders/') && url.includes('/status') && opts?.method === 'PATCH') {
        // extract new_status query
        const m = /new_status=([^&]+)/.exec(url)
        const newStatus = m ? decodeURIComponent(m[1]) : 'unknown'
        // return an updated order object depending on id
        const idMatch = /orders\/(.+?)\/status/.exec(url)
        const id = idMatch ? idMatch[1] : 'o-1'
        const updated = {
          order_id: id,
          restaurant_id: id === 'o-1' ? 1 : 2,
          order_items: [],
          subtotal: id === 'o-1' ? 10 : 20,
          tax_amount: 0,
          delivery_fee: 0,
          tip_amount: 0,
          discount_amount: 0,
          total_amount: id === 'o-1' ? 10 : 20,
          status: newStatus,
          created_at: new Date().toISOString(),
          delivery_address: {},
        }
        return Promise.resolve({ ok: true, json: async () => updated })
      }

      return Promise.resolve({ ok: false, status: 404 })
    })
  })

  it('accepts pending order and updates UI', async () => {
    render(<AdminOrdersPage />)

    // wait for data to load
    await waitFor(() => expect(screen.getByText('Order Management')).toBeInTheDocument())

    // initial pending order should show Accept button
    const acceptBtn = await screen.findByRole('button', { name: /Accept/i })
    expect(acceptBtn).toBeInTheDocument()

    // click accept
    fireEvent.click(acceptBtn)

    // after patch, status chip should update to 'confirmed'
    await waitFor(() => expect(screen.getAllByText(/confirmed/i).length).toBeGreaterThan(0))

    // ensure fetch was called for patch
    const calls = (global as any).fetch.mock.calls
    const patchCall = calls.find((c: any[]) => String(c[0]).includes('/status') && c[1] && c[1].method === 'PATCH')
    expect(patchCall).toBeTruthy()
  })

  it('marks confirmed order ready and navigates to restaurant', async () => {
    render(<AdminOrdersPage />)

    await waitFor(() => expect(screen.getByText('Order Management')).toBeInTheDocument())

    // find the Mark Ready button for confirmed order
    const markReadyBtn = await screen.findByRole('button', { name: /Mark Ready/i })
    expect(markReadyBtn).toBeInTheDocument()

    // click mark ready
    fireEvent.click(markReadyBtn)

    // expect status updated to 'ready'
    await waitFor(() => expect(screen.getAllByText(/ready/i).length).toBeGreaterThan(0))

    // find View Restaurant button for one of the rows and click
    const viewBtns = screen.getAllByRole('button', { name: /View Restaurant/i })
    expect(viewBtns.length).toBeGreaterThan(0)
    fireEvent.click(viewBtns[0])

    expect(pushMock).toHaveBeenCalled()
  })

  it('filters by restaurant name', async () => {
    render(<AdminOrdersPage />)

    await waitFor(() => expect(screen.getByText('Order Management')).toBeInTheDocument())

    // type filter 'R2' to only show second order
    const input = screen.getByLabelText(/Filter by restaurant/i)
    fireEvent.change(input, { target: { value: 'R2' } })

    // expect only R2 chip visible and order o-2 present
    await waitFor(() => expect(screen.getByText('R2')).toBeInTheDocument())
    expect(screen.queryByText('R1')).not.toBeInTheDocument()
  })

})
