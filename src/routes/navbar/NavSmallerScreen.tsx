import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FaSearch } from "react-icons/fa";
import { SearchNavbarIcon } from "../../utils/Icon.tsx";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "../../components/ui/sheet";
import { Button } from "../../components/ui/button";
import { Separator } from "../../components/ui/separator";

export type NavItem = { to: string; label: string; key: string };

type NavSmallerScreenProps = {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onSearchSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  navItems: NavItem[];
  renderAuthButtons: (variant: "desktop" | "mobile") => React.ReactNode;
  isAuthenticated: boolean;
  isLoggedIn: boolean;
  onProfileNavigate: () => void;
  translate: (key: string) => string;
};

const NavSmallerScreen = ({
  searchTerm,
  onSearchTermChange,
  onSearchSubmit,
  navItems,
  renderAuthButtons,
  isAuthenticated,
  isLoggedIn,
  onProfileNavigate,
  translate,
}: NavSmallerScreenProps) => {
  const [open, setOpen] = useState(false);
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSearchTermChange(event.target.value);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    onSearchSubmit(event);
    if (searchTerm.trim()) {
      setOpen(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="flex md:hidden items-center justify-center p-2 rounded text-faded-grey hover:bg-search-background hover:text-faded-grey">
          <SearchNavbarIcon className="text-faded-grey" />
        </button>
      </SheetTrigger>
      <SheetContent side="top" className="p-0 w-full h-screen overflow-y-auto">
        <div className="flex items-center h-[60px] bg-navbar px-4 py-3 border-b-2">
          <Link to="/" className="flex items-center">
            <img
              className="h-[30px]"
              src="/img/light_mode_logo.svg"
              alt="Webuddhist"
            />
          </Link>
        </div>
        <div className="px-2">
          <form
            className="flex items-center rounded-lg border border-custom-border bg-search-background"
            onSubmit={handleSearchSubmit}
          >
            <FaSearch className="ml-1.5 text-faded-grey" />
            <input
              type="search"
              placeholder={translate("common.placeholder.search")}
              value={searchTerm}
              onChange={handleInputChange}
              autoFocus={false}
              className="w-full border-none bg-transparent outline-none px-1 py-1.5 text-faded-grey placeholder:text-faded-grey"
            />
          </form>
        </div>
        <Separator />
        <div className="flex flex-col space-y-2 p-2">
          {navItems.map((navItem) => (
            <SheetClose asChild key={navItem.key}>
              <Link
                className="no-underline text-center text-faded-grey font-medium hover:underline transition-all"
                to={navItem.to}
              >
                {navItem.label}
              </Link>
            </SheetClose>
          ))}
        </div>
        <Separator />
        <div className="flex flex-col px-4">
          {renderAuthButtons("mobile")}
          {(isAuthenticated || isLoggedIn) && (
            <SheetClose asChild>
              <Button
                variant="ghost"
                onClick={onProfileNavigate}
                className="w-full rounded text-faded-grey"
              >
                {translate("header.profileMenu.profile")}
              </Button>
            </SheetClose>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NavSmallerScreen;
