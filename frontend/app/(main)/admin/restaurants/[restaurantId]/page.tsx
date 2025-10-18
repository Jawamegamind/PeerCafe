"use client"

import * as React from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Chip,
  Alert,
  Skeleton,
  IconButton,
  Paper,
  Breadcrumbs,
  Link as MuiLink,
  InputAdornment,
  Fab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Fastfood as FastfoodIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Restaurant as RestaurantIcon,
  AttachMoney as MoneyIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useParams, useRouter } from 'next/navigation';
import Navbar from "../../../../_components/navbar";

interface MenuItem {
  ItemId: number;
  RestaurantId: number;
  ItemName: string;
  Description: string;
  IsAvailable: boolean;
  Image: string;
  Price: number;
  CreatedAt: string;
  UpdatedAt: string;
  Quantity: number;
}

interface MenuItemFormData {
  ItemName: string;
  Description: string;
  IsAvailable: boolean;
  Image: string;
  Price: string;
  Quantity: string;
}

export default function AdminRestaurantMenuPage() {
  const { restaurantId } = useParams();
  const router = useRouter();

  const [restaurantName, setRestaurantName] = React.useState<string>('');
  const [menuItems, setMenuItems] = React.useState<MenuItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<MenuItem | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  
  const [formData, setFormData] = React.useState<MenuItemFormData>({
    ItemName: '',
    Description: '',
    IsAvailable: true,
    Image: '',
    Price: '',
    Quantity: '0'
  });
  
  const [alert, setAlert] = React.useState<{type: 'success' | 'error', message: string} | null>(null);

  React.useEffect(() => {
    if (!restaurantId) {
      router.push('/admin/restaurants');
      return;
    }
    fetchRestaurantInfo();
    fetchMenuItems();
  }, [restaurantId]);

  const fetchRestaurantInfo = async () => {
    try {
      // Mock data for now - replace with actual API call later
    //   setRestaurantName("Mario's Italian Restaurant");
        // Send API request to get restaurant info by ID
        const response = await fetch(`http://localhost:8000/api/restaurants/${restaurantId}`);
        const data = await response.json();
        console.log("Restaurant data:", data);

        // Set restaurant name from fetched data
        setRestaurantName(data.Name);
    } catch (error) {
      console.error('Error fetching restaurant info:', error);
    }
  };

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      // Fetch menu items from the API
      const response = await fetch(`http://localhost:8000/api/restaurants/${restaurantId}/menu`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch menu items: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Menu items data:", data);
      setMenuItems(data);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      setAlert({ type: 'error', message: 'Failed to load menu items' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        ItemName: item.ItemName,
        Description: item.Description || '',
        IsAvailable: item.IsAvailable,
        Image: item.Image || '',
        Price: item.Price.toString(),
        Quantity: item.Quantity.toString()
      });
    } else {
      setEditingItem(null);
      setFormData({
        ItemName: '',
        Description: '',
        IsAvailable: true,
        Image: '',
        Price: '',
        Quantity: '0'
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
  };

  const handleFormChange = (field: keyof MenuItemFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      if (!formData.ItemName.trim() || !formData.Price.trim()) {
        setAlert({ type: 'error', message: 'Please fill in required fields' });
        return;
      }

      const price = parseFloat(formData.Price);
      const quantity = parseInt(formData.Quantity);
      
      if (isNaN(price) || price <= 0) {
        setAlert({ type: 'error', message: 'Please enter a valid price greater than 0' });
        return;
      }

      if (isNaN(quantity) || quantity < 0) {
        setAlert({ type: 'error', message: 'Please enter a valid quantity' });
        return;
      }

      const menuItemData = {
        ItemName: formData.ItemName.trim(),
        Description: formData.Description.trim(),
        IsAvailable: formData.IsAvailable,
        Image: formData.Image.trim(),
        Price: price,
        Quantity: quantity
      };

      let response;
      
      if (editingItem) {
        // Update existing menu item
        response = await fetch(
          `http://localhost:8000/api/restaurants/${restaurantId}/menu/${editingItem.ItemId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(menuItemData),
          }
        );
      } else {
        // Create new menu item
        response = await fetch(
          `http://localhost:8000/api/restaurants/${restaurantId}/menu`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(menuItemData),
          }
        );
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setAlert({ 
          type: 'success', 
          message: editingItem ? 'Menu item updated successfully' : 'Menu item created successfully'
        });
        
        // Refresh the menu items list
        await fetchMenuItems();
        handleCloseDialog();
      } else {
        throw new Error(result.message || 'Failed to save menu item');
      }
      
    } catch (error) {
      console.error('Error saving menu item:', error);
      setAlert({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to save menu item' 
      });
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/restaurants/${restaurantId}/menu/${item.ItemId}/availability`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setAlert({ type: 'success', message: result.message });
        // Refresh the menu items to get updated data
        await fetchMenuItems();
      } else {
        throw new Error(result.message || 'Failed to update availability');
      }
    } catch (error) {
      console.error('Error updating availability:', error);
      setAlert({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to update availability' 
      });
    }
  };

  const handleDeleteItem = async (item: MenuItem) => {
    if (!confirm(`Are you sure you want to delete "${item.ItemName}"?`)) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8000/api/restaurants/${restaurantId}/menu/${item.ItemId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setAlert({ type: 'success', message: 'Menu item deleted successfully' });
        // Refresh the menu items list
        await fetchMenuItems();
      } else {
        throw new Error(result.message || 'Failed to delete menu item');
      }
    } catch (error) {
      console.error('Error deleting menu item:', error);
      setAlert({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to delete menu item' 
      });
    }
  };

  // Filter and paginate items
  const filteredItems = menuItems.filter(item =>
    item.ItemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.Description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedItems = filteredItems.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <>
      <Navbar />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Alert */}
        {alert && (
          <Alert 
            severity={alert.type} 
            onClose={() => setAlert(null)}
            sx={{ mb: 3 }}
          >
            {alert.message}
          </Alert>
        )}

        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 3 }}>
          <MuiLink 
            component="button"
            variant="body2"
            onClick={() => router.push('/admin/dashboard')}
            sx={{ textDecoration: 'none' }}
          >
            Admin Dashboard
          </MuiLink>
          <MuiLink 
            component="button"
            variant="body2"
            onClick={() => router.push('/admin/restaurants')}
            sx={{ textDecoration: 'none' }}
          >
            Restaurants
          </MuiLink>
          <Typography variant="body2" color="text.primary">
            Menu Management
          </Typography>
        </Breadcrumbs>

        {/* Header */}
        <Paper elevation={2} sx={{ p: 4, mb: 4, backgroundColor: '#f8f9fa' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h4" component="h1" fontWeight="bold" color="primary.main" gutterBottom>
                🍽️ Menu Management
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Restaurant: {restaurantName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Restaurant ID: {restaurantId}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Chip 
                label={`${menuItems.length} item${menuItems.length !== 1 ? 's' : ''}`}
                color="primary"
                variant="outlined"
              />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
                size="large"
              >
                Add Menu Item
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* Search and Controls */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              placeholder="Search menu items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 300, flex: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              {filteredItems.length} of {menuItems.length} items
            </Typography>
          </Box>
        </Paper>

        {/* Menu Items Table */}
        <Paper sx={{ overflow: 'hidden' }}>
          {loading ? (
            <Box sx={{ p: 4 }}>
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} variant="rectangular" height={60} sx={{ mb: 1 }} />
              ))}
            </Box>
          ) : menuItems.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <FastfoodIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No menu items yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Start building your menu by adding your first item
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
              >
                Add First Menu Item
              </Button>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell><strong>Item Name</strong></TableCell>
                      <TableCell><strong>Description</strong></TableCell>
                      <TableCell><strong>Price</strong></TableCell>
                      <TableCell><strong>Quantity</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell><strong>Updated</strong></TableCell>
                      <TableCell align="center"><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedItems.map((item) => (
                      <TableRow key={item.ItemId} hover>
                        <TableCell>
                          <Typography variant="subtitle1" fontWeight="medium">
                            {item.ItemName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {item.Description || 'No description'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body1" fontWeight="medium" color="primary.main">
                            ${item.Price.toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={item.Quantity}
                            size="small"
                            color={item.Quantity > 0 ? 'success' : 'error'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={item.IsAvailable ? 'Available' : 'Unavailable'}
                            color={item.IsAvailable ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(item.UpdatedAt).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            <IconButton
                              size="small"
                              onClick={() => handleToggleAvailability(item)}
                              color={item.IsAvailable ? 'success' : 'default'}
                              title={item.IsAvailable ? 'Mark as unavailable' : 'Mark as available'}
                            >
                              {item.IsAvailable ? <VisibilityIcon /> : <VisibilityOffIcon />}
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog(item)}
                              color="primary"
                              title="Edit item"
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteItem(item)}
                              color="error"
                              title="Delete item"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={filteredItems.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </>
          )}
        </Paper>

        {/* Floating Add Button */}
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 24, right: 24 }}
          onClick={() => handleOpenDialog()}
        >
          <AddIcon />
        </Fab>

        {/* Menu Item Dialog */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                label="Item Name *"
                fullWidth
                value={formData.ItemName}
                onChange={(e) => handleFormChange('ItemName', e.target.value)}
              />

              <TextField
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={formData.Description}
                onChange={(e) => handleFormChange('Description', e.target.value)}
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Price *"
                  type="number"
                  inputProps={{ step: "0.01", min: "0" }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  value={formData.Price}
                  onChange={(e) => handleFormChange('Price', e.target.value)}
                  sx={{ flex: 1 }}
                />

                <TextField
                  label="Quantity *"
                  type="number"
                  inputProps={{ min: "0" }}
                  value={formData.Quantity}
                  onChange={(e) => handleFormChange('Quantity', e.target.value)}
                  sx={{ flex: 1 }}
                />
              </Box>

              <TextField
                label="Image URL"
                fullWidth
                value={formData.Image}
                onChange={(e) => handleFormChange('Image', e.target.value)}
                placeholder="https://example.com/image.jpg"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.IsAvailable}
                    onChange={(e) => handleFormChange('IsAvailable', e.target.checked)}
                  />
                }
                label="Available for ordering"
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleCloseDialog} startIcon={<CancelIcon />}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} variant="contained" startIcon={<SaveIcon />}>
              {editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
}