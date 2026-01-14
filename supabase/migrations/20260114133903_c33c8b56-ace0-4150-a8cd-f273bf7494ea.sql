
-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'company_admin', 'employee', 'specialist');

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create companies table
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email_domain TEXT NOT NULL UNIQUE,
    admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    logo_url TEXT,
    is_paid BOOLEAN DEFAULT FALSE,
    max_employees INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Create company_employees table
CREATE TABLE public.company_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined')),
    invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (company_id, email)
);

-- Enable RLS on company_employees
ALTER TABLE public.company_employees ENABLE ROW LEVEL SECURITY;

-- Create specialists table
CREATE TABLE public.specialists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    specialty TEXT NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    hourly_rate DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on specialists
ALTER TABLE public.specialists ENABLE ROW LEVEL SECURITY;

-- Create availability_slots table
CREATE TABLE public.availability_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    specialist_id UUID REFERENCES public.specialists(id) ON DELETE CASCADE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_booked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on availability_slots
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;

-- Create bookings table
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_id UUID REFERENCES public.availability_slots(id) ON DELETE CASCADE NOT NULL,
    employee_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    specialist_id UUID REFERENCES public.specialists(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'completed', 'cancelled')),
    zoom_link TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User roles: users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

-- Admins can manage all roles
CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Profiles policies
CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Companies policies
CREATE POLICY "Authenticated users can view companies"
ON public.companies FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Company admins can update their company"
ON public.companies FOR UPDATE
USING (auth.uid() = admin_user_id);

CREATE POLICY "Authenticated users can create companies"
ON public.companies FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = admin_user_id);

-- Company employees policies
CREATE POLICY "Company admins can manage employees"
ON public.company_employees FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.companies 
        WHERE id = company_employees.company_id 
        AND admin_user_id = auth.uid()
    )
);

CREATE POLICY "Employees can view their own invitations"
ON public.company_employees FOR SELECT
USING (user_id = auth.uid() OR email = (SELECT email FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Employees can update their own invitation status"
ON public.company_employees FOR UPDATE
USING (email = (SELECT email FROM public.profiles WHERE user_id = auth.uid()));

-- Specialists policies
CREATE POLICY "Anyone authenticated can view active specialists"
ON public.specialists FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage specialists"
ON public.specialists FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Specialists can update their own profile"
ON public.specialists FOR UPDATE
USING (user_id = auth.uid());

-- Availability slots policies
CREATE POLICY "Authenticated users can view available slots"
ON public.availability_slots FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Specialists can manage their own slots"
ON public.availability_slots FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.specialists 
        WHERE id = availability_slots.specialist_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Admins can manage all slots"
ON public.availability_slots FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Bookings policies
CREATE POLICY "Users can view their own bookings"
ON public.bookings FOR SELECT
USING (employee_user_id = auth.uid());

CREATE POLICY "Specialists can view their bookings"
ON public.bookings FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.specialists 
        WHERE id = bookings.specialist_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Employees can create bookings"
ON public.bookings FOR INSERT
TO authenticated
WITH CHECK (employee_user_id = auth.uid());

CREATE POLICY "Specialists can update booking status"
ON public.bookings FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.specialists 
        WHERE id = bookings.specialist_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own bookings"
ON public.bookings FOR UPDATE
USING (employee_user_id = auth.uid());

-- Create trigger for profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_specialists_updated_at
    BEFORE UPDATE ON public.specialists
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
