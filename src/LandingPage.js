import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import './LandingPage.css';

function LandingPage({ showSignIn }) {
  const pricingPlans = [
    {
      name: 'Free',
      storage: '5 GB',
      price: '€0/month',
      features: ['Basic storage', 'File sharing', 'Web access'],
      buttonText: 'Sign Up - Free'
    },
    {
      name: 'Standard',
      storage: '105 GB',
      price: '€9.99/month',
      features: ['All Free features', 'Increased storage', 'Priority support'],
      buttonText: 'Choose Standard'
    },
    {
      name: 'Premium',
      storage: '205 GB',
      price: '€19.99/month',
      features: ['All Standard features', 'More storage', 'Advanced security'],
      buttonText: 'Choose Premium'
    },
    {
      name: 'Gold',
      storage: '305 GB',
      price: '€29.99/month',
      features: ['All Premium features', 'Massive storage', '24/7 VIP support'],
      buttonText: 'Choose Gold'
    },
  ];

  return (
    <div className="landing-page">
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            My Dropbox
          </Typography>
          <Button color="inherit" onClick={showSignIn}>Sign In</Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 8, mb: 8, textAlign: 'center' }}>
        <Typography variant="h2" component="h1" gutterBottom>
          Your Secure Cloud Storage Solution
        </Typography>
        <Typography variant="h5" component="p" color="text.secondary" sx={{ mb: 4 }}>
          Store, share, and access your files from anywhere, on any device. My Dropbox offers reliable and secure cloud storage for all your needs.
        </Typography>
        <Button variant="contained" size="large" onClick={showSignIn}>
          Get Started for Free
        </Button>
      </Container>

      <Container maxWidth="lg" sx={{ mb: 8 }}>
        <Typography variant="h3" component="h2" textAlign="center" gutterBottom sx={{ mb: 6 }}>
          Flexible Pricing Plans
        </Typography>
        <Grid container spacing={4} justifyContent="center">
          {pricingPlans.map((plan) => (
            <Grid item xs={12} sm={6} md={3} key={plan.name}>
              <Card className="pricing-card">
                <CardContent>
                  <Typography variant="h5" component="h3" gutterBottom>
                    {plan.name}
                  </Typography>
                  <Typography variant="h4" color="primary" sx={{ mb: 2 }}>
                    {plan.price}
                  </Typography>
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
                    {plan.storage} Storage
                  </Typography>
                  <List dense>
                    {plan.features.map((feature, index) => (
                      <ListItem key={index} disablePadding>
                        <ListItemIcon>
                          <CheckCircleOutlineIcon color="success" />
                        </ListItemIcon>
                        <ListItemText primary={feature} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
                <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                  <Button variant="outlined" onClick={showSignIn}>
                    {plan.buttonText}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      <Box component="footer" sx={{ bgcolor: 'primary.main', color: 'white', p: 3, textAlign: 'center' }}>
        <Typography variant="body2">
          &copy; {new Date().getFullYear()} My Dropbox. All rights reserved.
        </Typography>
      </Box>
    </div>
  );
}

export default LandingPage;
